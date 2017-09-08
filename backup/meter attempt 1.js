var context;
var activeCues = {};
var globalPanControl = document.getElementById("global_pan_control");
var globalGainControl = document.getElementById("global_gain_control");
var globalPanDisplay = document.getElementById("global_pan_display");
var globalGainDisplay = document.getElementById("global_gain_display");

try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
} catch (e) {
    alert('Web Audio API is not supported in this browser.');
}

var globalPanNode = context.createStereoPanner();
var globalGainNode = context.createGain();
globalPanNode.connect(globalGainNode);
globalGainNode.connect(context.destination);
setGlobalPan(globalPanControl.value);
setGlobalGain(globalGainControl.value);
globalGainNode.gain.value = dBToGain(globalGainControl.value);
globalPanControl.oninput = function() { setGlobalPan(globalPanControl.value); };
globalGainControl.oninput = function() { setGlobalGain(globalGainControl.value); };
globalPanControl.ondblclick = function() { setGlobalPan(0); };
globalGainControl.ondblclick = function() { setGlobalGain(0); };

var analyserL = context.createAnalyser();
var analyserR = context.createAnalyser();
var splitter = context.createChannelSplitter();
var meterProc = context.createScriptProcessor(4096, 1, 1);
analyserL.smoothingTimeConstant = 0.3;
analyserR.smoothingTimeConstant = 0.3;
analyserL.fftSize = 1024;
analyserR.fftSize = 1024;

globalGainNode.connect(splitter); // Duplicate connection from main bus for metering
splitter.connect(analyserL, 0, 0);
splitter.connect(analyserR, 0, 0);
analyserL.connect(meterProc); // Serves as sample clock--no audio through
meterProc.connect(context.destination); // Must be connected to process--no audio through

function setGlobalGain(dB) {
    globalGainControl.value = dB;
    globalGainDisplay.innerHTML = dB + "dB";
    globalGainNode.gain.value = dBToGain(dB);
}
function setGlobalPan(pan) {
    globalPanControl.value = pan;
    globalPanDisplay.innerHTML = pan;
    globalPanNode.pan.value = pan / 50;
}

function dBToGain(dB) {
    if (dB == -60)
        return 0;
    return Math.pow(10, dB / 20.0);
}

function gainTodB(gain) {
    return 20 * Math.log(gain) / Math.LN10;
}

class Playback {
    
    constructor(context) {
        this.context = context;
        this.globalPanNode = globalPanNode;
        this.globalGainNode = globalGainNode;
    }

    init() {
        this.source1 = this.context.createBufferSource();
        this.panNode = this.context.createStereoPanner();
        this.gainNode = this.context.createGain();

        this.source1.connect(this.panNode);
        this.panNode.connect(this.gainNode);
        this.gainNode.connect(this.globalPanNode);
        
        this.panNode.pan.value = getPan(this.cueNum) / 50;
        this.gainNode.gain.value = dBToGain(getVol(this.cueNum));
        
        this.source1.onended = function() {
            delete activeCues[this.cueNum];
            // Enable go button
        };
    }
    
    syncParams() {
        //alert(this.source1.buffer.duration);
        //setDur(this.cueNum, this.source1.buffer.duration);
    }
    
    play(cueNum, start, stop) {
        this.cueNum = cueNum;
        this.file = getAudioFile(cueNum);
        if (this.file == null) {
            alert("Could not play cue. No file selected.");
            return;
        }
        var self = this;
        this.obtainBytes(this.file, function(bytesAsArrayBuffer) {
            self.decodeBytes(bytesAsArrayBuffer);
        });
        
        this.init();
        this.syncParams();
        
        this.source1.start(start);
        //this.stop(stop);
    }
    
    stop(time) {
        //this.gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1);
        this.source1.stop(time);
    }

    obtainBytes(selectedFile, callback) {
        var reader = new FileReader();
        reader.onload = function(ev) {
            var bytesAsArrayBuffer = reader.result;
            callback(bytesAsArrayBuffer);
        };
        reader.readAsArrayBuffer(selectedFile);
    }

    decodeBytes(bytesAsArrayBuffer) {
        var self = this;
        this.context.decodeAudioData(bytesAsArrayBuffer, function(decodedSamplesAsAudioBuffer) {
            self.source1.buffer = decodedSamplesAsAudioBuffer;
        });
    }
}

function go(cueNum) {
    cueNum = cueNum || currentCue;
    
    var cue = new Playback(context);
    cue.play(cueNum, context.currentTime);
    activeCues[cueNum]= cue;
    advance();
}

function stop(cueNum) {
    activeCues[cueNum].stop(context.currentTime);
    delete activeCues[cueNum];
}

function advance() {
    var action = getAction(currentCue);
    var targetId = getTargetId(currentCue);
    
    if (targetId === 0 && currentCue + 1 > cueListLength) {
        return;
    } else if (targetId === 0) {
        targetId = currentCue + 1;
    }
    
    if (action === "SP") {
        go(targetId);
    } else {
        currentCue = targetId;
        select(targetId);
    }
}

function stopAll() {
    for (var key in activeCues) {
        activeCues[key].stop(context.currentTime);
        delete activeCues[key];
    }
}

meterProc.onaudioprocess = function() {
    var binDataL =  new Uint8Array(analyserL.frequencyBinCount);
    analyserL.getByteFrequencyData(binDataL);
    var avgL = getAverageVol(binDataL);

    var binDataR =  new Uint8Array(analyserR.frequencyBinCount);
    analyserR.getByteFrequencyData(binDataR);
    var avgR = getAverageVol(binDataR);
};

function getAverageVol(binData) {
    var sum = 0;
    for (var i = 0; i < binData.length; i++) {
        sum += binData[i];
    }
    //console.log(sum / binData.length);
    return sum / binData.length;
}


processor.onaudioprocess = function(evt){
  var input = evt.inputBuffer.getChannelData(0)
    len = input.length   
    total = i = 0
    rms
  while ( i < len ) total += Math.abs( input[i++] )
  rms = Math.sqrt( total / len )
  meter.style.width = ( rms * 100 ) + '%' 
}


