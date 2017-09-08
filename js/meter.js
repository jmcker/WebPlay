var DB_MIN = -60;
var DB_MAX = 0;
var CLIP_HOLD = 5.0;
var CLIP_LEVEL = 1.00;
var clippedL = false;
var clippedR = false;
var lastClipL = 0;
var lastClipR = 0;
var METER_L = document.getElementById("meterL");
var METER_R = document.getElementById("meterR");

function createMeter(context) {
    var analyserL = context.createAnalyser();
    var analyserR = context.createAnalyser();
    var meterProcL = context.createScriptProcessor(4096, 1, 1);
    var meterProcR = context.createScriptProcessor(4096, 1, 1);
    analyserL.smoothingTimeConstant = 0.5;
    analyserR.smoothingTimeConstant = 0.5;
    analyserL.fftSize = 32;
    analyserR.fftSize = 32;
    analyserL.minDecibels = DB_MIN;
    analyserL.maxDecibels = DB_MAX;
    analyserR.minDecibels = DB_MIN;
    analyserR.maxDecibels = DB_MAX;
    
    var activeOut = meteredOuputSelector.value;
    console.log("Created meter for Output " + activeOut);
    outputs[activeOut + "_splitter"].connect(analyserL, 0);
    outputs[activeOut + "_splitter"].connect(analyserR, 1);
    analyserL.connect(meterProcL); // Serves as sample clock--no audio through
    meterProcL.connect(context.destination); // Must be connected to process--no audio through
    analyserR.connect(meterProcR);
    meterProcR.connect(context.destination);
    
    meterProcL.onaudioprocess = function(event) {
        
        if (clippedL && lastClipL + CLIP_HOLD < context.currentTime) {
            clippedL = false;
            lastClipL = 0;
            resetClipIndicator(0);
        }
        
        var inputL = event.inputBuffer.getChannelData(0);
        var sumL = 0;
        for (var i = 0; i < inputL.length; ++i) {
            sumL += inputL[i] * inputL[i];
            if (Math.abs(inputL[i]) > CLIP_LEVEL) {
                clippedL = true;
                //console.log("Signal is clipping.");
                lastClipL = context.currentTime;
                document.getElementById("clippedL").style.backgroundColor = "red";
            }
        }
        var rmsL = Math.sqrt(sumL / inputL.length);
        METER_L.value = (rmsL * 2).toFixed(2);
    };
    
    meterProcR.onaudioprocess = function(event) {
        
        if (clippedR && lastClipR + CLIP_HOLD < context.currentTime) {
            clippedR = false;
            lastClipR = 0;
            resetClipIndicator(1);
        }
        
        var inputR = event.inputBuffer.getChannelData(0);
        var sumR = 0;
        for (var i = 0; i < inputR.length; ++i)
        {
            sumR += inputR[i] * inputR[i];
            if (Math.abs(inputR[i]) > CLIP_LEVEL) {
                clippedR = true;
                //console.log("Signal is clipping.");
                document.getElementById("clippedR").style.backgroundColor = "red";
                lastClipR = context.currentTime;
            }
        }
        var rmsR = Math.sqrt(sumR / inputR.length);
        METER_R.value = (rmsR * 2).toFixed(2);
    };
    
    return [meterProcL, meterProcR];
}

function resetClipIndicator(channel) {
    if (channel === 0) {
        clippedL = false;
        lastClipL = 0;
        document.getElementById("clippedL").style.backgroundColor = "";
    }
    else if (channel === 1) {
        clippedR = false;
        lastClipR = 0;
        document.getElementById("clippedR").style.backgroundColor = "";
    }
    else
        console.log("Channel " + channel + " is not a valid channel number. Could not reset clipping indicator.");
}