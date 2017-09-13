var context;
var activeCues = {};
var outputs = {};
var meteredOutput = 1;
var previewing = null;
var GLOBAL_AUDIO_FADE_TIME = 4.0;
var globalPanControl = document.getElementById("global_pan_control");
var globalGainControl = document.getElementById("global_gain_control");
var globalPanDisplay = document.getElementById("global_pan_display");
var globalGainDisplay = document.getElementById("global_gain_display");
var meteredOuputSelector = document.getElementById("metered_output_selector");
var outputMerger = {};

try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
} catch (e) {
    alert("Web Audio API is not supported in this browser.");
}

function createOutputs() {
    var maxChannelCount = context.destination.maxChannelCount;
    console.log("Device max channel count: " + maxChannelCount);
    maxChannelCount = Math.min(maxChannelCount, 8); // Allow 8 channels at most due to possible Chrome bug
    console.log("Usable channel count: " + maxChannelCount);
    context.destination.channelCount = maxChannelCount;
    context.destination.channelCountMode = "explicit";
    context.destination.channelInterpretation = "discrete";
    outputMerger = context.createChannelMerger(maxChannelCount);
    outputMerger.connect(context.destination);

    // Populate outputs object
    // Ouputs represented in cascading stereo pairs as Out 1=chan(1,2), 2=chan(3,4), 3=chan(5,6), etc
    // Pan can be used to send as mono
    var currChan = 0;
    for (var i = 1; i <= context.destination.channelCount / 2; i++) {
        var pan = context.createStereoPanner();
        pan.pan.value = globalPanControl.value;
    
        var gain = context.createGain();
        gain.gain.value = dBToGain(globalGainControl.value);
    
        var splitter = context.createChannelSplitter(2);
        splitter.channelCountMode = "explicit";
        splitter.channelInterpretation = "discrete";
    
        pan.connect(gain);
        gain.connect(splitter);
        splitter.connect(outputMerger, 0, currChan++); // Connect "Left" channel of splitter to respective "Left" channel of output
        splitter.connect(outputMerger, 1, currChan++); // Connect "Right" channel of splitter to respective "Right" channel of output
        outputs[i] = pan; // Pan is first in each output chain, so it acts as the "output" that other channels are connected to
        outputs[i + "_gain"] = gain;
        outputs[i + "_splitter"] = splitter;
    }

    // Setup the preview bus
    outputs[0] = context.createChannelSplitter(2);
    outputs[0].connect(outputMerger, 0, 0);
    outputs[0].connect(outputMerger, 1, 1);

    // Add output options to metering selector
    meteredOuputSelector.innerHTML = "";
    for (var i = 1; i <= context.destination.channelCount / 2; i++) {
        var option = document.createElement("option");
        option.value = i;
        option.text = "Ouput " + i;
        option.title = "Channels " + (i * 2 - 1) + "&" + (i * 2);
        meteredOuputSelector.add(option);
    }

    return outputs;
}

// Create and connect outputs
createOutputs();

// Create metering processors
var meterProc = createMeter(context);

setGlobalPan(globalPanControl.value);
setGlobalGain(globalGainControl.value);
globalPanControl.oninput = function() { setGlobalPan(globalPanControl.value); };
globalGainControl.oninput = function() { setGlobalGain(globalGainControl.value); };
globalPanControl.ondblclick = function() { setGlobalPan(0); };
globalGainControl.ondblclick = function() { setGlobalGain(0); };
meteredOuputSelector.onchange = function() {
    setGlobalGain(gainTodB(outputs[this.value + "_gain"].gain.value).toFixed(0));
    setGlobalPan((outputs[this.value].pan.value * 50).toFixed(0));
    
    // Create a new meter
    meterProc[0].disconnect();
    meterProc[1].disconnect();
    meterProc = createMeter(context);
    resetClipIndicator(0);
    resetClipIndicator(1);
}

function setGlobalGain(dB) {
    var output = meteredOuputSelector.value;
    globalGainControl.value = dB;
    globalGainDisplay.innerHTML = dB + "dB";
    outputs[output + "_gain"].gain.value = dBToGain(dB);
}

function setGlobalPan(pan) {
    var output = meteredOuputSelector.value;
    globalPanControl.value = pan;
    globalPanDisplay.innerHTML = pan;
    outputs[output].pan.value = pan / 50;
}

function dBToGain(dB) {
    if (dB == -60)
        return 0;
    return Math.pow(10, dB / 20.0);
}

function gainTodB(gain) {
    return 20 * (Math.log(gain) / Math.LN10);
}

function centsToPercentage(cents) {
    return 100 * Math.round(1000000 * Math.pow(2, (cents / 100 / 12))) / 1000000; // Maintain floating point accuracy
}

function percentageToCents(perc) {
    var ratio = perc / 100;
    return Math.round(Math.round(1000000 * 1200 * Math.log(ratio) / Math.log(2)) / 1000000, 0); // Maintain floating point accuracy
}




class AudioCue {

    constructor(context, cueNum) {
        this.context = context;
        this.cueNum = cueNum;
        
        this.paused = false;
        this.pausePoint = 0;
    }

    init() {
        this.player = new Audio();
        this.source = this.context.createMediaElementSource(this.player);
        this.panNode = this.context.createStereoPanner();
        this.gainNode = this.context.createGain();

        this.source.connect(this.panNode);
        this.panNode.connect(this.gainNode);
        if (this.output <= context.destination.channelCount / 2) {
            this.gainNode.connect(outputs[this.output]);
        } else {
            onscreenAlert("Output #" + this.output + " not available. Patched to Output #1.");
            this.gainNode.connect(outputs[1]);
        }

        this.panNode.pan.value = this.pan;
        this.gainNode.gain.value = this.gain;
        if (this.fadeInTime > 0) {
            this.gainNode.gain.value = 0.001;
        }
    }

    syncParams() {
        this.pan = getPan(this.cueNum) / 50;
        this.vol = getVol(this.cueNum);
        this.gain = dBToGain(getVol(this.cueNum));
        this.pitch = getPitch(this.cueNum);
        this.detune = percentageToCents(this.pitch);
        this.playbackRate = this.pitch / 100;
        this.startPos = getStartPosInSecs(this.cueNum);
        this.stopPos = getStopPosInSecs(this.cueNum);
        this.filename = getFilename(this.cueNum);
        this.fileDuration = getFileDurInSecs(this.cueNum);
        this.cueDuration = this.stopPos - this.startPos;
        this.fadeInTime = getFadeIn(this.cueNum);
        this.fadeOutTime = getFadeOut(this.cueNum);
        this.loops = getLoops(this.cueNum);
        this.currentLoop = 1;
        this.output = getOutput(this.cueNum);
        this.action = getAction(this.cueNum);
        this.targetId = getTargetId(this.cueNum);
    }

    play() {
        
        if (!hasFile(this.cueNum)) {
            onscreenAlert("Could not play cue. No file found for Cue #" + cueNum + ".");
            return;
        }
        
        if (!this.paused) {
            
            this.syncParams();
            this.init();
            
            this.player.src = filer.pathToFilesystemURL(this.filename);
            //this.player.playbackRate = this.playbackRate;
        }
        
        var self = this;
        this.paused = false; // Reset paused flag
        this.player.currentTime = this.startPos + this.pausePoint; // Seek to start position + elapsed time before pause
        this.player.oncanplaythrough = function() {
            // Start the HTML player
            self.player.play();
            self.player.oncanplaythrough = function() {}; // Overwrite the oncanplaythrough handler to prevent firing multiple times when seeking
            
            self.startTimer();
        };
    }
    
    stop() {
        
        this.player.pause(); // Stop the HTML player
        clearInterval(this.intervalId); // Stop checking the clock
        this.player.removeAttribute("src"); // Remove src from HTML player
        this.source = null;
        this.player = null;
        console.log("Stopped Cue #" + this.cueNum + ".");
        
        setElapsed(this.cueNum, null);
        setRemaining(this.cueNum, null);
        resetProgressBar(this.cueNum);
        delete activeCues[this.cueNum];
        console.log("Removed Cue #" + this.cueNum + " from the currently playing list.");
        
        checkButtonLock();
    }
    
    fade(length) {
        length = length || GLOBAL_AUDIO_FADE_TIME;
        length = parseFloat(length);
        
        console.log("Manual fade started at: " + this.context.currentTime +
                  "/nManual fade length: " + length);
        
        // Fade to 0.001 because 0 is invalid
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + length);
        
        // Real-time visual on volume fader in edit menu
        if (currentlyEditing === this.cueNum) {
            logVolSlide(this.context.currentTime, this.context.currentTime + length, this.gainNode.gain.value, this.gain, this.vol);
        }
        
        // Stop playback after the fade has completed
        var self = this;
        setTimeout(function() { self.stop(); }, length * 1000 + 10); // Padded 10 ms
    }
    
    // time - fade's scheduled end time on context clock
    fadeIn(time) {
        time = time || this.context.currentTime + this.fadeInTime;
        
        console.log("Fade in started at: " + this.context.currentTime +
                  "\nFade in ends at: " + time);
        
        this.gainNode.gain.value = 0.001;
        this.gainNode.gain.exponentialRampToValueAtTime(this.gain, time);
        
        // Real-time visual on volume fader in edit menu
        if (currentlyEditing === this.cueNum) {
            logVolSlide(this.context.currentTime, time, this.gainNode.gain.value, this.gain, this.vol);
        }
    }
    
    // time - fade's scheduled end time on context clock
    fadeOut(time) {
        time = time || this.context.currentTime + this.fadeOutTime;
        
        console.log("Fade out started at: " + this.context.currentTime +
                 "\nFade out ends at: " + time);
        
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, time);
        
        // Real-time visual on volume fader in edit menu
        if (currentlyEditing === this.cueNum) {
            logVolSlide(this.context.currentTime, time, this.gainNode.gain.value, 0.001, this.vol);
        }
    }

    pause() {
        if (this.paused) {
            onscreenAlert("Cue #" + this.cueNum + " is already paused.");
            return;
        }
        
        this.paused = true;
        clearInterval(this.intervalId); // Stop updating progress bars and checking the clock
        this.pausePoint = getElapsed(this.cueNum);
        this.gainNode.gain.cancelAndHoldAtTime(this.context.currentTime); // Hold current automation if fade is in action. Fade will resume when cue resumes
        this.panNode.pan.cancelAndHoldAtTime(this.context.currentTime);
        // TODO: Check if pitch need to be cancelled and held
        this.player.pause(); // Pause the player
        
        // Add yellow progress bar
        document.getElementById(this.cueNum + "0005").style.backgroundImage = "url(images/yellow-dot.jpg)";
        
        console.log("Paused Cue #" + this.cueNum + " at " + secToTime(getElapsed(this.cueNum)) + ".");
    }
    
    resume() {
        if (!this.paused) {
            onscreenAlert("Cannot resume. Cue #" + this.cueNum + " is not paused.");
            return;
        }
        
        // Remove yellow progress bar and allow CSS to take back over
        document.getElementById(this.cueNum + "0005").style.backgroundImage = "";
        
        // Resume playback
        this.play();
        
        console.log("Resumed Cue #" + this.cueNum + " at " + secToTime(getElapsed(this.cueNum)) + ".");
    }

    volumeChange(targetVoldB, length) {
        length = parseFloat(length);
        
        console.log("Volume change started at: " + this.context.currentTime +
                  "\nVolume change length: " + length);
        
        this.gainNode.gain.exponentialRampToValueAtTime(dBToGain(targetVoldB), this.context.currentTime + length);
        
        // Real-time visual on volume fader in edit menu
        if (currentlyEditing === this.cueNum) {
            logVolSlide(this.context.currentTime, this.context.currrentTime + length, this.gainNode.gain.value, dBToGain(targetVoldB), targetVoldB);
        }

        // Volume change to -60 is considered fade out
        if (targetVoldB === -60) {
            // Stop playback after the fade out has completed
            var self = this;
            setTimeout(function() { self.stop(); }, length * 1000 + 10); // Padded 10 ms
        }
    }

    startTimer() {
        var self = this;
        var fading = false;
        var contextStartLoc = self.context.currentTime;
        var contextStopLoc = contextStartLoc + self.cueDuration - self.pausePoint; // Compensate for shorter cue length when resuming from pause
        var contextFadeLoc = contextStartLoc + self.cueDuration - self.fadeOutTime - self.pausePoint;
            
        // Fade in if the cue has a fade and the fade has not passed already
        if (self.fadeInTime > 0 && self.pausePoint < self.fadeInTime)
            self.fadeIn(contextStartLoc + self.fadeInTime - self.pausePoint); // Scheduled to end at cue start + fade length
                
        console.log("Current time: " + self.context.currentTime +
                    "\nCurrent loop: #" + self.currentLoop + " of " + self.loops +
                    "\nAudio start position: " + (self.pausePoint ? self.startPos + self.pausePoint + " (from pause)" : self.startPos) +
                    "\nAudio stop position: " + self.stopPos +
                    "\nContext stop time: " + contextStopLoc);
            
        self.intervalId = setInterval(function() {
                
            // Update the playback progress bar (fake a context time in the past when coming from pause so that the bars start in the correct position)
            self.updateProgressDisplay(contextStartLoc - self.pausePoint);
               
            // If the cue has a fade, is not fading, and should be fading, start the fade
            if (!fading && self.fadeOutTime > 0 && self.context.currentTime >= contextFadeLoc) {
                    
                fading = true;
                    
                // contextFadeLoc may be negative if the paused point lies somewhere within the bounds of (fadeout start) and (cue end)
                // Though initial gain when resuming will not be correct, the cue will still fade out and end within the expected duration
                self.fadeOut(contextFadeLoc + self.fadeOutTime);
                    
                // Handle FP and FA actions if they have not already been handled before the cue was paused
                if (self.action.includes("F") && self.pausePoint < contextFadeLoc) {
                    advance(self.targetId, self.action);
                }
            }
    
            // If the iteration should be over, check to see if the cue should go into another iteration or stop
            if (self.context.currentTime >= contextStopLoc) {
                if (self.currentLoop === self.loops) {
                        
                    // Stop playback and erase the active cue
                    console.log("Completed loop #" + self.currentLoop + " of " + self.loops + " for preview Cue #" + self.cueNum + ".");
                        
                    // Handle EA and EP actions
                    // Handle FA and FP actions for cues with 0 second fadeouts
                    if (self.action.includes("E") || (self.fadeOutTime === 0 && self.action.includes("F")))
                        advance(self.targetId, self.action);
                        
                    self.stop();
                } else {
                        
                    // Move to next iteration of the loop
                    console.log("Completed loop #" + self.currentLoop + " of " + self.loops + " for preview Cue #" + self.cueNum + ".");
                        
                    self.currentLoop++;
                    resetProgressBar(self.cueNum);
                        
                    // Store the new iteration start and stop times (context clock)
                    contextStartLoc += self.cueDuration - self.pausePoint;
                    contextStopLoc += self.cueDuration;
                    contextFadeLoc += self.cueDuration;
                        
                    // Reset pause to prevent compensating for it more than once
                    self.pausePoint = 0;
                        
                    // Seek to the start position
                    self.player.currentTime = self.startPos;
                        
                    // Fade in the next iteration
                    fading = false; // Reset FADEOUT flag
                    if (self.fadeInTime > 0)
                        self.fadeIn(self.context.currentTime + self.fadeInTime);
                }
            }
        }, 20);
    }
    
    // contextStart - time on the context clock at which the current iteration of the cue started
    updateProgressDisplay(contextStart) {
        var now = this.context.currentTime;
        var elapsed = (now - contextStart).toFixed(1);
        var remaining = (this.cueDuration - elapsed).toFixed(1);
        var percentDone = parseInt(elapsed / this.cueDuration * 100);
        
        setElapsed(this.cueNum, elapsed);
        setRemaining(this.cueNum, remaining);
        updateProgressBar(this.cueNum, percentDone, remaining);
    }
}


class Preview {

    constructor(context) {
        this.context = context;
        this.cueNum = currentlyEditing;
    }

    init() {
        this.player = new Audio();
        this.source = this.context.createMediaElementSource(this.player);
        this.panNode = this.context.createStereoPanner();
        this.gainNode = this.context.createGain();
        this.pitch = this.context.create

        this.source.connect(this.panNode);
        this.panNode.connect(this.gainNode);
        this.gainNode.connect(outputs[0]);

        this.panNode.pan.value = this.pan;
        this.gainNode.gain.value = this.gain;
        if (this.fadeInTime > 0) {
            this.gainNode.gain.value = 0.001;
        }
    }

    syncParams() {
        var evol = document.getElementById("vol_in");
        var epan = document.getElementById("pan_in");
        var epitch = document.getElementById("pitch_in");
        var efile = document.getElementById("edit_file");
        var efilename = document.getElementById("edit_filename");
        var efilelength = document.getElementById("edit_file_length");
        var efadein = document.getElementById("edit_fade_in");
        var efadeout = document.getElementById("edit_fade_out");
        var eloops = document.getElementById("edit_loops");
        
        this.vol = parseInt(evol.value);
        this.gain = dBToGain(this.vol);
        this.pan = parseInt(epan.value) / 50;
        this.pitch = parseInt(epitch.value);
        this.detune = percentageToCents(this.pitch);
        this.playbackRate = this.pitch / 100;
        this.file = efile.files[0];
        this.filename = efilename.innerHTML;
        this.startPos = getEditStartPos();
        this.stopPos = getEditStopPos();
        this.fileDuration = timeToSec(efilelength.innerHTML);
        this.cueDuration = this.stopPos - this.startPos;
        this.fadeInTime = parseInt(efadein.value);
        this.fadeOutTime = parseInt(efadeout.value);
        this.loops = parseInt(eloops.value);
        this.currentLoop = 1;
    }

    // Scheduled playback and stopping using "time" parameter is no longer possible because of switch from buffered playback source
    play() {
        
        this.syncParams();
        this.init();
        
		if (!this.file && this.filename === "") {
            onscreenAlert("Could not preview cue. No file loaded.");
            return;
        }
        
        // Turn preview button into stop preview button
		var previewButton = document.getElementById("edit_preview");
		setButtonLock(true);
        previewButton.innerHTML = "Stop Preview";
        previewButton.onclick = function() { self.stop(0); };
        
        previewing = this; // Global reference
		var self = this; // Create local reference to this
    
        // Load the file into the hidden player via filesystem or object URL
        if (this.file) {
            this.player.src = URL.createObjectURL(this.file);
        } else {
            this.player.src = filer.pathToFilesystemURL(this.filename);
        }
        this.player.currentTime = this.startPos;
        
        if (this.player.preservesPitch) {
            this.player.preservesPitch = false;
            console.log("Preview preserve pitch set to: " + this.player.preservesPitch);
        } else if (this.player.webkitPreservesPitch) {
            this.player.webkitPreservesPitch = false;
            console.log("Preview preserve pitch set to: " + this.player.webkitPreservesPitch);
        } else if (this.player.mozPreservesPitch) {
            this.player.mozPreservesPitch = false;
        }
        
        this.player.playbackRate = this.playbackRate;
        
        this.player.oncanplaythrough = function() {
            // Start the HTML player
            self.player.play();
            self.player.oncanplaythrough = function() {};
            
            startTimer();
        };
    }

	// Scheduled playback and stopping using "time" parameter is no longer possible because of switch from buffered playback source
    stop() {
        
        this.player.pause(); // Stop the HTML player
        clearInterval(this.intervalId); // Stop checking the clock
        URL.revokeObjectURL(this.player.src); // Revoke the object URL to prevent memory leaks
        this.player.removeAttribute("src"); // Remove src from HTML player
        this.source = null;
        this.player = null;
        console.log("Stopped preview.");
        
        // Reset preview button
        var previewButton = document.getElementById("edit_preview");
        previewButton.innerHTML = "Preview";
        previewButton.setAttribute('onclick', 'preview()');
        setButtonLock(false);
        
        // Clear the global reference
        previewing = null;
    }
    
    // time - fade's scheduled end time on context clock
    fadeIn(time) {
        time = time || this.context.currentTime + this.fadeInTime;
        
        console.log("Fade in started at: " + this.context.currentTime +
                  "\nFade in ends at: " + time);
        
        this.gainNode.gain.value = 0.001;
        this.gainNode.gain.exponentialRampToValueAtTime(this.gain, time);
        
        // Real-time visual on volume fader in edit menu
        logVolSlide(this.context.currentTime, time, this.gainNode.gain.value, this.gain, this.vol);
    }
    
    // time - fade's scheduled end time on context clock
    fadeOut(time) {
        time = time || this.context.currentTime + this.fadeOutTime;
        
        console.log("Fade out started at: " + this.context.currentTime +
                  "\nFade out ends at: " + time);
        
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, time);
        
        // Real-time visual on volume fader in edit menu
        logVolSlide(this.context.currentTime, time, this.gainNode.gain.value, 0.001, this.vol);
    }

    startTimer() {
        var fading = false;
        var contextStartLoc = self.context.currentTime;
        var contextStopLoc = contextStartLoc + self.cueDuration;
        var contextFadeLoc = contextStartLoc + self.cueDuration - self.fadeOutTime;
            
        // Fade in if the cue has a fade
        if (self.fadeInTime > 0)
            self.fadeIn(contextStartLoc + self.fadeInTime); // Scheduled to end at cue start + fade length
            
        console.log("Current time: " + self.context.currentTime +
                    "\nAudio start position: " + self.startPos +
                    "\nAudio stop position: " + self.stopPos +
                    "\nContext stop time: " + contextStopLoc +
                    "\nLoops: " + self.loops);
            
        self.intervalId = setInterval(function() {
               
            // If the cue has a fade, is not fading, and should be fading, start the fade
            if (!fading && self.fadeOutTime > 0 && self.context.currentTime >= contextFadeLoc) {
                fading = true;
                self.fadeOut(self.context.currentTime + self.fadeOutTime); // Scheduled to end at current time + fade length
            }
    
            // If the iteration should be over, check to see if the cue should go into another iteration or stop
            if (self.context.currentTime >= contextStopLoc) {
                if (self.currentLoop === self.loops) {
                    console.log("Completed loop #" + self.currentLoop + " of " + self.loops + " for preview Cue #" + self.cueNum + ".");
                    // Stop playback
                    self.stop();
                } else {
                    // Move to next iteration of the loop
                    console.log("Completed loop #" + self.currentLoop + " of " + self.loops + " for preview Cue #" + self.cueNum + ".");
                    self.currentLoop++;
                    contextStartLoc += self.cueDuration;
                    contextStopLoc += self.cueDuration;
                    contextFadeLoc += self.cueDuration - self.fadeOutTime;
                    fading = false;
                        
                    self.player.currentTime = self.startPos; // Seek to the start position
                    if (self.fadeInTime > 0)
                        self.fadeIn(self.context.currentTime + self.fadeInTime);
                }
            }
        }, 20);
    }
}


class WaitCue {
    
    constructor(context, cueNum) {
        this.context = context;
        this.cueNum = cueNum;
    }
    
    init() {
        this.duration = getCueDurInSecs(this.cueNum);
        this.targetId = this.cueNum + 1;
        this.action = getAction(this.cueNum);
    }
    
    play() {
        this.init();
        this.startTimer();
    }
    
    stop() {
        console.log("Stopped Wait Cue #" + this.cueNum + ".");
        
        clearInterval(this.intervalId);
        setElapsed(this.cueNum, null);
        setRemaining(this.cueNum, null);
        resetProgressBar(this.cueNum);
        
        delete activeCues[this.cueNum];
        console.log("Removed Cue #" + this.cueNum + " from the currently playing list.");
        console.dir(activeCues);
        checkButtonLock();
    }

    startTimer() {
        var self = this;
        var contextStart = this.context.currentTime;
        var contextStop = contextStart + this.duration;

        console.log("Wait started at: " + contextStart +
                  "\nWait ends at: " + contextStop);

        this.intervalId = setInterval(function() {
            self.updateProgressDisplay(contextStart);
            
            if (context.currentTime >= contextStop) {
                // Handle EA, EP, FA, and FP actions
                if (self.action.includes("E") || self.action.includes("F")) {
                    advance(self.targetId, self.action);
                }
                self.stop();
            }
        }, 100);
    }
    
    updateProgressDisplay(contextStart) {
        var now = this.context.currentTime;
        var elapsed = (now - contextStart).toFixed(2);
        var remaining = (this.duration - elapsed).toFixed(2);
        var percentDone = parseInt(elapsed / this.duration * 100);
        
        setElapsed(this.cueNum, elapsed);
        setRemaining(this.cueNum, remaining);
        updateProgressBar(this.cueNum, percentDone, remaining);
    }
}


class ControlCue {
    
    constructor(context, cueNum) {
        this.context = context;
        this.cueNum = cueNum;
    }
    
    init() {
        this.duration = getFileDurInSecs(this.cueNum);
        this.targetId = getControlTargetId(this.cueNum);
        this.action = getControlAction(this.cueNum);
        
        var params = getControlActionParams(this.cueNum);
        this.length = parseFloat(params.length);
        this.volume = parseFloat(params.volume);
        this.pan = parseInt(params.pan) / 50;
        this.pitch = parseFloat(params.pitch);
    }
    
    play() {
        
        this.init();
        
        // Target is previous cue and previous cue does not exist
        if (this.targetId > cueListLength || this.targetId === 0 && currentCue === 1) {
            checkButtonLock();
            this.stop();
        } else if (this.targetId === 0) {
            this.targetId = this.cueNum - 1;
        }
        
        		// TODO: Add methods to take caare of displays
		switch (this.action) {
			case "cue_start":
				go(this.targetId);
				break;
			case "cue_stop":
				if (activeCues[this.targetId]) {
					activeCues[this.targetId].stop();
				} else {
					onscreenAlert("Cue #" + this.targetId + " is not playing.");
					this.stop();
                    return;
				}
				break;
			case "cue_fade":
				if (activeCues[this.targetId]) {
					activeCues[this.targetId].fade(this.length);
				} else {
					onscreenAlert("Cue #" + this.targetId + " is not playing");
					this.stop();
                    return;
				}
				break;
			case "cue_pause":
				if (activeCues[this.targetId]) {
				    if (MEDIA_CUE_TYPES.includes(getType(this.targetId))) {
					    activeCues[this.targetId].pause();
				    } else {
				        onscreenAlert("Cue #" + this.targetId + " cannot be paused.")
                        this.stop();
                        return;
				    }
				} else {
					onscreenAlert("Cue #" + this.targetId + " is not playing.");
					this.stop();
                    return;
				}
				break;
			case "cue_resume":
				if (activeCues[this.targetId]) {
					if (MEDIA_CUE_TYPES.includes(getType(this.targetId)) && activeCues[this.targetId].paused) {
					    activeCues[this.targetId].resume();
				    } else {
				        onscreenAlert("Cue #" + this.targetId + " cannot be resumed.")
                        this.stop();
                        return;
				    }
				} else {
				    onscreenAlert("Cue #" + this.targetId + " is not paused.");
					this.stop();
                    return;
				}
				break;
			case "vol_change":
				if (activeCues[this.targetId]) {
                    if (AUDIO_MEDIA_CUE_TYPES.includes(getType(this.targetId))) {
					    activeCues[this.targetId].volumeChange(this.volume, this.length);
				    } else {
				        onscreenAlert("Cue #" + this.targetId + " does not have audio.")
                        this.stop();
                        return;
				    }
				} else {
					onscreenAlert("Cue #" + this.targetId + " is not playing.");
					this.stop();
                    return;
				}
				break;
			case "pan_change":
				if (activeCues[this.targetId]) {
				    console.dir(activeCues[this.targetId].panNode.pan);
				    console.log(this.context.currentTime);
				    console.log(this.context.currentTime + this.length);
					activeCues[this.targetId].panNode.pan.linearRampToValueAtTime(this.pan, this.context.currentTime + this.length);
					// TODO: Real-time pan visual in edit cue menu
				} else {
					onscreenAlert("Cue #" + this.targetId + " is not playing.");
					this.stop();
                    return;
				}
				break;
			case "pitch_change":
				if (activeCues[this.targetId]) {
					alert("TODO");
					// TODO: Real-time pitch visual in edit cue menu
				} else {
					onscreenAlert("Cue #" + this.targetId + " is not playing.");
					this.stop();
                    return;
				}
				break;
			case "exit_loop":
				if (activeCues[this.targetId]) {
                    if (AUDIO_MEDIA_CUE_TYPES.includes(getType(this.targetId))) {
					    activeCues[this.targetId].currentLoop = activeCues[this.targetId].loops;
				    } else {
				        onscreenAlert("Cue #" + this.targetId + " does not have loops.")
                        this.stop();
                        return;
				    }
				} else {
					onscreenAlert("Cue #" + this.targetId + " is not playing.");
					this.stop();
                    return;
				}
				break;
			case "set_position":
				alert("TODO");
				if (activeCues[this.targetId]) {
					// Update displays with context.currentTime - setPosition
				} else {}
				
				break;
			case "stop_all":
				stopAll();
				break;
			case "fade_all":
				fadeAll();
				break;
			case "fade_all_prev":
				fadeAllPrevious(this.cueNum, this.length);
				break;
			default:
				onscreenAlert("Control action " + this.action + " could not be applied to Cue #" + this.targetId + ".");
				break;
		}
		
		// Check advance action
		if (getAction(this.cueNum) === "SP" || getAction(this.cueNum) === "SA")
			advance(getTargetId(this.cueNum), getAction(this.cueNum));

        if (this.duration > 0) {
		    this.startTimer();
		} else {
		    this.stop();
		}
    }
    
    stop() {
        console.log("Stopped Control Cue #" + this.cueNum + ".");
        
        clearInterval(this.intervalId);
        setElapsed(this.cueNum, null);
        setRemaining(this.cueNum, null);
        resetProgressBar(this.cueNum);
        
        console.log(activeCues[this.cueNum])
        console.log(delete activeCues[this.cueNum]);
        console.log("Removed Cue #" + this.cueNum + " from the currently playing list.");
        console.dir(activeCues);
        checkButtonLock();
    }
    
    startTimer() {
        var self = this;
        var contextStart = this.context.currentTime;
        var contextStop = contextStart + this.duration;
        
        console.log("Control started at: " + contextStart);
        console.log("Control ends at: " + contextStop);
        
        this.intervalId = setInterval(function() {
            self.updateProgressDisplay(contextStart);
            
            if (context.currentTime >= contextStop) {
                // Handle EA, EP, FA, and FP actions
                if (self.action.includes("E") || self.action.includes("F")) {
                    advance(self.targetId, self.action);
                }
                self.stop();
            }
        }, 100);
    }
    
    updateProgressDisplay(contextStart) {
        var now = this.context.currentTime;
        var elapsed = (now - contextStart).toFixed(2);
        var remaining = (this.duration - elapsed).toFixed(2);
        var percentDone = parseInt(elapsed / this.duration * 100);
        
        setElapsed(this.cueNum, elapsed);
        setRemaining(this.cueNum, remaining);
        updateProgressBar(this.cueNum, percentDone, remaining);
    }
}


// Sync data from file to edit menu
function syncDataFromMediaElement(cueNum, file) {
    cueNum = cueNum || currentlyEditing;
    
    if (!file) {
        setEditFileLength(null);
        setFileDur(cueNum, null);
        setCueDur(cueNum, null);
        onscreenAlert("No file provided for Cue #" + cueNum + ".");
        return;
    }
    
    var player = document.createElement("audio");
    player.controls = true;
    objURL = URL.createObjectURL(file);
    player.src = objURL;

    player.oncanplaythrough = function() {
        var dur = player.duration.toFixed(3);
        // Don't set actual cue duration in case user selects cancel
        setEditStartPos([0, 0, 0]);
        setEditStartPosMax(secToArray(dur));
        setEditStopPos(secToArray(dur));
        setEditStopPosMax(secToArray(dur));
        setEditStartPosMax(secToArray(dur));
        setEditFileLength(dur);
        setEditButtonLock(false);
        objURL.revokeObjectURL;
        
    };
}

function preview(cueNum) {
    cueNum = cueNum || currentlyEditing;
    
    var preview = new Preview(context);
    preview.play();
}

function go(cueNum) {
    cueNum = cueNum || currentCue;
    var ctype = getType(cueNum);
    
    if (!getEnabled(cueNum)) {
        onscreenAlert("Cue #" + cueNum + " is not enabled.");
        return;
    }

    if (activeCues[cueNum]) {
        onscreenAlert("Cue #" + cueNum + " is already active.");
        return;
    }

    // Update and prime displays if applicable
    console.log(cueNum);
    updateDisplays(cueNum);

    if (ctype === "memo") {
        advance(cueNum + 1, "SA");
        return; // Only has SA actions
    }
    if (ctype === "wait") {
        var wait = new WaitCue(context, cueNum);
        activeCues[cueNum] = wait;
        wait.play();
        return; // Only has E actions
    }
    if (ctype === "audio" || ctype === "blank_audio") {
        if (getFilename(cueNum) === "") {
            onscreenAlert("No file found for Cue #" + cueNum + ".");
            return;
        }
    
        var audio = new AudioCue(context, cueNum);
        activeCues[cueNum] = audio;
        audio.play();
    }
    if (ctype === "control") {
        var control = new ControlCue(context, cueNum);
        activeCues[cueNum] = control;
        control.play();
        return; // Handles S, E, and F actions
    }
    if (ctype === "image") {
        if (primed[cueNum]) {
            activeCues[cueNum] = primed[cueNum];
            primed[cueNum].play();
            delete primed[cueNum];
        } else {
            var image = new ImageCue(context, cueNum);
            activeCues[cueNum] = image;
            image.play();
        }
    }
    
    
    // FA, FP, EA, and EP actions are taken care of on an indiviaul basis per ctype
    var action = getAction(cueNum);
    if (action === "SP" || action === "SA")
        advance();
}

function advance(targetId, action) {
    action = action || getAction(currentCue);
    targetId = targetId || getTargetId(currentCue);

    // Target is next cue and next cue does not exist
    if (targetId > cueListLength || targetId === 0 && currentCue + 1 > cueListLength) {
        checkButtonLock();
        return;
    } else if (targetId === 0) {
    // Target is next cue--lock targetId to actual cue number
        targetId = currentCue + 1;
    }

    // If cue is not enabled, try cue after it
    if (getEnabled(targetId) === false) {
        advance(targetId + 1);
        return;
    }

    currentCue = targetId;
    select(currentCue);
    if (action === "SP" || action === "EP" || action === "FP") {
        go(targetId);
    }
}

function updateDisplays(cueNum) {
    var current = cueNum || currentCue;
    var nextVisualCue = -1;
    for (var i = current + 1; i <= cueListLength; i++) {
        if (VISUAL_MEDIA_CUE_TYPES.includes(getType(i))) {
            if (!primed[i]) {
                nextVisualCue = i;
                break;
            }
        }
    }

    if (!primed[nextVisualCue] && nextVisualCue != -1 && current - nextVisualCue <= cuesBeforeBlackout) {
        var image = new ImageCue(context, nextVisualCue);
        image.init(false); // Prime and load but do not display
        primed[nextVisualCue] = image;
    }

    return nextVisualCue;
}

function stop(cueNum) {
    cueNum = cueNum || currentCue;

    if (activeCues[cueNum]) {
        activeCues[cueNum].stop();
    }
    // Checked button lock already in cue.stop();
}

function stopAll() {
    for (var key in activeCues) {
        activeCues[key].stop();
    }
    // Checked button lock already in cue.stop()
}

function fade(cueNum, fadeLength) {
    if (VISUAL_MEDIA_CUE_TYPES.includes(getType(i))) {
        fadeLength = fadeLength || GLOBAL_VISUAL_FADE_TIME;
    } else {
        fadeLength = fadeLength || GLOBAL_AUDIO_FADE_TIME;
    }
    cueNum = cueNum || currentCue;
    
    if (activeCues[cueNum] && MEDIA_CUE_TYPES.includes(getType(cueNum))) {
        activeCues[cueNum].fade();
    }
}

function fadeAll(fadeLength) {
    for (var key in activeCues) {
        activeCues[key].fade(fadeLength); // Pass fadeLength to fade and let it deal with it
    }
}

function fadeAllPrevious(cueNum, fadeLength) {
    for (var key in activeCues) {
        if (key < cueNum) {
            activeCues[key].fade(fadeLength);
        }
    }
}