var displays = {};
var primed = {};

// Cue type lists
var MEDIA_CUE_TYPES = ["audio", "blank_audio", "image", "video", "HTML"];
var AUDIO_MEDIA_CUE_TYPES = ["audio", "blank_audio", "video"]
var VISUAL_MEDIA_CUE_TYPES = ["image", "video", "HTML"];

class ImageCue {
    
    constructor(context, cueNum) {
        this.context = context;
        this.cueNum = cueNum;

        this.div = document.createElement("div");
        this.image = new Image();

        this.paused = false;
        this.pausePoint = 0;

        this.primed = false;
    }

    init(reveal) {
        reveal = reveal || false;

        // Sync all cue parameters
        this.filename = getFilename(this.cueNum);
        this.display = getDisplay(this.cueNum);
        this.fadeInTime = getFadeIn(this.cueNum);
        this.fadeOutTime = getFadeOut(this.cueNum);
        this.duration = getCueDurInSecs(this.cueNum);
        this.action = getAction(this.cueNum);
        this.targetId = getTargetId(this.cueNum);
        this.timeBased = getIsTimeBased(this.cueNum);

        // Check if cue has file
        if (!this.filename) {
            onscreenAlert("No file found for Cue #" + this.cueNum + "."); // Alert main window
            this.stop();
            return;
        }

        var self = this;
        this.image.onload = function() {
            self.div.style.transition = "opacity " + self.fadeInTime + "s ease-in-out";
            self.image.classList.remove("loading");

            if (reveal && self.primed) {
                var result  = revealContent(self.display, self.cueNum);
                if (result) {
                    self.startTimer();
                } else {
                    return;
                }
            } else if (!self.primed) {
                self.stop();
                return;
            }
        };

        this.image.className = "elem loading";
        this.image.src = filer.pathToFilesystemURL(this.filename);

        // Create black div to frame object if aspect ratio match is not perfect
        // Prevents other active content from being shown underneath
        this.div.id = this.cueNum;
        this.div.className = "elem-frame";
        this.div.appendChild(this.image);
        this.primed = primeDisplay(this.display, this.div); // Pre-load file
    }

    play() {
        
        // Check if display is primed and if image is loaded
        if (!this.primed || this.image.classList.contains("loading")) {
            this.init(true); // Prime, load, and reveal image
        } else {
            if (this.image.src === "" || !this.image.src) {
                onscreenAlert("File " + this.filename + " not found for Display " + this.display + "."); // Alert main window
                this.stop();
                return;
            }

            var result = revealContent(this.display, this.cueNum);
            if (result) {
                this.startTimer();
            } else {
                return;
            }

        }

        // Warn if display is muted
        if (displays[this.display] && displays[this.display].iframe.contentWindow && !displays[this.display].iframe.contentWindow.document.body.classList.contains("active")) {
            onscreenAlert("Warning: Display " + this.display + " is AV muted.", 5);
        }
    }

    stop() {
        clearInterval(this.intervalId);
        this.div.style.transition = ""; // Remove fades
        hideContent(this.display, this.cueNum);
        if (this.div.parentNode) {
            this.div.parentNode.removeChild(this.div); // Remove from display window
        }
        console.log("Stopped Cue #" + this.cueNum + ".");

        setElapsed(this.cueNum, null);
        setRemaining(this.cueNum, null);
        resetProgressBar(this.cueNum);
        delete activeCues[this.cueNum];
        console.log("Removed Cue #" + this.cueNum + " from the currently playing list.");
        
        checkButtonLock();

    }

    pause() {
        if (this.paused) {
            onscreenAlert("Cue #" + this.cueNum + " is already paused.");
            return;
        }
        
        this.paused = true;
        clearInterval(this.intervalId); // Stop updating progress bars and checking the clock
        this.pausePoint = getElapsed(this.cueNum);
        
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

    fade(length) {
        length = length || userConfig.GLOBAL_VISUAL_FADE_TIME;
        if (length < 0)
            return;

        this.div.style.transition = "opacity " + length + "s ease-in-out";
        hideContent(this.display, this.cueNum);

        var self = this;
        setTimeout(function() { self.stop(); }, length * 1000 + 10); // Padded 10 ms
    }

    fadeIn(time) {
        var length = (time) ? time - this.context.currentTime : this.fadeInTime || userConfig.GLOBAL_VISUAL_FADE_TIME;
        
        this.div.style.transition = "opacity " + length + "s ease-in-out";
        revealContent(this.display, this.cueNum);
    }
    

    fadeOut(time) {
        var length = (time) ? time - this.context.currentTime : this.fadeOutTime || userConfig.GLOBAL_VISUAL_FADE_TIME;
        
        this.div.style.transition = "opacity " + length + "s ease-in-out";
        hideContent(this.display, this.cueNum);
    }

    startTimer() {
        var self = this;
        var fading = false;
        var contextStart = this.context.currentTime;
        var contextStop = contextStart + this.duration - this.pausePoint;
        var contextFade = contextStop - this.fadeOutTime - this.pausePoint;
        
        // Fade in if the cue has a fade and the fade has not passed already
        if (self.fadeInTime > 0)
            self.fadeIn(contextStart + self.fadeInTime); // Scheduled to end at cue start + fade length

        console.log("Image started at: " + contextStart);
        console.log("Image ends at: " + contextStop);
        
        this.intervalId = setInterval(function() {
            self.updateProgressDisplay(contextStart - self.pausePoint);
            
            if (!fading && self.fadeOutTime > 0 && self.context.currentTime >= contextFade) {
                fading = true;

                self.fadeOut(); // Use this.fadeOutTime

                // Handle FP and FA actions if not already handled before pause
                if (self.action.includes("F") && self.pausePoint < contextFade) {
                    if (self.targetId == 0) {
                        advance (self.cueNum + 1, self.action);
                    } else {
                        advance(self.targetId, self.action);
                    }
                }
            }

            if (context.currentTime >= contextStop) {
                // Handle EA, EP, and 0s F actions
                if (self.action.includes("E") || (self.fadeOutTime === 0 && self.action.includes("F"))) {
                    if (self.targetId == 0) {
                        advance (self.cueNum + 1, self.action);
                    } else {
                        advance(self.targetId, self.action);
                    }
                }

                self.stop();
            }

            // Reset flag
            self.paused = false;
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

class VideoCue {
    
    constructor(context, cueNum) {
        this.context = context;
        this.cueNum = cueNum;

        this.div = document.createElement("div");
        this.player = document.createElement("video");

        this.paused = false;
        this.pausePoint = 0;

        this.primed = false;
    }

    init(reveal) {
        reveal = reveal || false;
        
        // Sync all cue parameters
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
        this.display = getDisplay(this.cueNum);
        this.action = getAction(this.cueNum);
        this.targetId = getTargetId(this.cueNum);

        // Check if cue has file
        if (!this.filename) {
            onscreenAlert("No file found for Cue #" + this.cueNum + "."); // Alert main window
            this.stop();
            return;
        }

        // Create audio nodes
        this.source = this.context.createMediaElementSource(this.player);
        this.panNode = this.context.createStereoPanner();
        this.gainNode = this.context.createGain();

        // Connect audio nodes
        this.source.connect(this.panNode);
        this.panNode.connect(this.gainNode);
        if (this.output <= context.destination.channelCount / 2) {
            this.gainNode.connect(outputs[this.output]);
        } else {
            onscreenAlert("Output #" + this.output + " not available. Patched to Output #1.");
            this.gainNode.connect(outputs[1]);
        }

        // Set audio node values
        this.panNode.pan.value = this.pan;
        this.gainNode.gain.value = this.gain;
        if (this.fadeInTime > 0) {
            this.gainNode.gain.value = 0.001;
        }

        var self = this;
        this.player.oncanplaythrough = function() {
            self.player.style.transition = "opacity " + self.fadeInTime + "s ease-in-out";
            self.player.classList.remove("loading");
            self.player.oncanplaythrough = function() {}; // Overwrite the oncanplaythrough handler to prevent firing multiple times when seeking to loopStart

            if (reveal && self.primed) {
                var result = revealContent(self.display, self.cueNum);
                if (result) {
                    self.player.play();
                    self.startTimer();
                } else {
                    // Reveal errored and the content could not be shown
                    return;
                }
            } else if (!self.primed) {
                self.stop();
                return;
            }
        };

        this.player.className = "elem loading";
        this.player.src = filer.pathToFilesystemURL(this.filename);

        // Create black div to frame object if aspect ratio match is not perfect
        // Prevents other active content from being shown underneath
        this.div.id = this.cueNum;
        this.div.className = "elem-frame";
        this.div.appendChild(this.player);
        this.player.currentTime = this.startPos; // Seek to start position + elapsed time before pause
        this.primed = primeDisplay(this.display, this.div); // Pre-load file
    }

    play() {

        // Resume from pause
        var self = this;
        if (this.paused) {
            this.paused = false; // Reset paused flag
            this.player.currentTime = this.startPos + this.pausePoint; // Seek to start position + elapsed time before pause

            // Start the player after the file has been buffered
            this.player.oncanplaythrough = function() {
                // Start the HTML player
                self.player.play();
                self.player.oncanplaythrough = function() {}; // Overwrite the oncanplaythrough handler to prevent firing multiple times when seeking
            
                self.startTimer();
            };

            // Prevent further processing
            return;
        }

        // Check if display is primed and if video is loaded
        if (!this.primed || this.player.classList.contains("loading")) {
            this.init(true); // Prime, load, reveal, and play video
        } else {
            if (this.player.src === "" || !this.player.src) {
                onscreenAlert("File " + this.filename + " not found for Display " + this.display + "."); // Alert main window
                this.stop();
                return;
            }

            // Player is already loaded and oncanplaythrough has already fired
            var result = revealContent(this.display, this.cueNum);
            if (result) {
                this.player.play();
                this.startTimer();
            } else {
                return;
            }
            
        }

        // Warn if display is muted
        if (displays[this.display] && displays[this.display].iframe.contentWindow && !displays[this.display].iframe.contentWindow.document.body.classList.contains("active")) {
            onscreenAlert("Warning: Display " + this.display + " is AV muted.", 5);
        }
    }

    stop() {

        this.player.pause(); // Stop the HTML player
        clearInterval(this.intervalId); // Stop checking the clock

        this.div.style.transition = ""; // Remove fades
        hideContent(this.display, this.cueNum);
        if (this.div.parentNode) {
            this.div.parentNode.removeChild(this.div); // Remove from display window
        }

        console.log("Stopped Cue #" + this.cueNum + ".");
        
        setElapsed(this.cueNum, null);
        setRemaining(this.cueNum, null);
        resetProgressBar(this.cueNum);
        delete activeCues[this.cueNum];
        console.log("Removed Cue #" + this.cueNum + " from the currently playing list.");
        
        checkButtonLock();
    }

    pause() {
        if (this.paused) {
            onscreenAlert("Cue #" + this.cueNum + " is already paused.");
            return;
        }
        
        this.player.pause(); // Pause the player
        this.paused = true;
        clearInterval(this.intervalId); // Stop updating progress bars and checking the clock
        this.pausePoint = getElapsed(this.cueNum);
        this.gainNode.gain.cancelAndHoldAtTime(this.context.currentTime); // Hold current automation if fade is in action. Fade will resume when cue resumes
        this.panNode.pan.cancelAndHoldAtTime(this.context.currentTime);
        // TODO: Check if pitch need to be cancelled and held
        
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

    fade(length) {
        var vlength = length || userConfig.GLOBAL_VISUAL_FADE_TIME;
        var alength = length || userConfig.GLOBAL_AUDIO_FADE_TIME;

        // Wait for longer fade to finish before calling stop()
        length = (vlength > alength) ? vlength : alength;

        this.div.style.transition = "opacity " + vlength + "s ease-in-out";
        hideContent(this.display, this.cueNum);
        
        // Fade to 0.001 because 0 is invalid
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + alength);
        
        // Real-time visual on volume fader in edit menu
        if (currentlyEditing === this.cueNum) {
            logVolSlide(this.context.currentTime, this.context.currentTime + alength, this.gainNode.gain.value, this.gain, this.vol);
        }

        var self = this;
        setTimeout(function() { self.stop(); }, length * 1000 + 10); // Padded 10 ms
    }

    fadeIn(time) {
        // Visual fade is based on length, not scheduled context time
        // Calculate length if given a context time or use either the cue fade in time or the global visual fade time
        var vlength = (time) ? time - this.context.currentTime : this.fadeInTime || userConfig.GLOBAL_VISUAL_FADE_TIME;

        // Audio fade is based on scheduled context time
        // Use the time provided or schedule a time at (now + the cue fade in time or the global audio fade time)
        var atime = (time) ? time : this.context.currentTime + (this.fadeInTime || userConfig.GLOBAL_AUDIO_FADE_TIME);
        
        this.div.style.transition = "opacity " + vlength + "s ease-in-out";
        revealContent(this.display, this.cueNum);
        
        this.gainNode.gain.value = 0.001;
        this.gainNode.gain.exponentialRampToValueAtTime(this.gain, atime);
        
        // Real-time visual on volume fader in edit menu
        if (currentlyEditing === this.cueNum) {
            logVolSlide(this.context.currentTime, atime, this.gainNode.gain.value, this.gain, this.vol);
        }
    }
    

    fadeOut(time) {
        // Visual fade is based on length, not scheduled context time
        // Calculate length if given a context time or use either the cue fade out time or the global visual fade time
        var vlength = (time) ? time - this.context.currentTime : this.fadeOutTime || userConfig.GLOBAL_VISUAL_FADE_TIME;
        
        // Audio fade is based on scheduled context time
        // Use the time provided or schedule a time at (now + the cue fade out time or the global audio fade time)
        var atime = (time) ? time : this.context.currentTime + (this.fadeOutTime || userConfig.GLOBAL_AUDIO_FADE_TIME);

        this.div.style.transition = "opacity " + vlength + "s ease-in-out";
        hideContent(this.display, this.cueNum);
        
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, atime);
        
        // Real-time visual on volume fader in edit menu
        if (currentlyEditing === this.cueNum) {
            logVolSlide(this.context.currentTime, atime, this.gainNode.gain.value, 0.001, this.vol);
        }
    }

    volumeChange(targetVoldB, length) {
        length = parseFloat(length);
        
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
                    "\nVideo start position: " + (self.pausePoint ? self.startPos + self.pausePoint + " (from pause)" : self.startPos) +
                    "\nVideo stop position: " + self.stopPos +
                    "\nContext stop time: " + contextStopLoc);
            
        this.intervalId = setInterval(function() {
                
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
                    if (self.targetId == 0) {
                        advance (self.cueNum + 1, self.action);
                    } else {
                        advance(self.targetId, self.action);
                    }
                }
            }
    
            // If the iteration should be over, check to see if the cue should go into another iteration or stop
            if (self.context.currentTime >= contextStopLoc) {
                if (self.currentLoop === self.loops) {
                        
                    // Stop playback and erase the active cue
                    console.log("Completed loop " + self.currentLoop + " of " + self.loops + " for Cue #" + self.cueNum + ".");
                        
                    // Handle EA and EP actions
                    // Handle FA and FP actions for cues with 0 second fadeouts
                    if (self.action.includes("E") || (self.fadeOutTime === 0 && self.action.includes("F"))) {
                        if (self.targetId == 0) {
                            advance (self.cueNum + 1, self.action);
                        } else {
                            advance(self.targetId, self.action);
                        }
                    }
                        
                    self.stop();
                } else {
                        
                    // Move to next iteration of the loop
                    console.log("Completed loop " + self.currentLoop + " of " + self.loops + " for Cue #" + self.cueNum + ".");
                        
                    self.currentLoop++;
                    resetProgressBar(self.cueNum);
                        
                    // Store the new iteration start and stop times (context clock)
                    contextStartLoc += self.cueDuration - self.pausePoint;
                    contextStopLoc += self.cueDuration;
                    contextFadeLoc += self.cueDuration;
                        
                    // Reset pause to prevent compensating for it more than once
                    self.pausePoint = 0;
                        
                    // Seek to the start position and play again
                    self.player.oncanplaythrough = function() {
                        self.player.play();
                        self.player.canplaythrough = function() {};
                    }
                    self.player.currentTime = self.startPos;
                        
                    // Fade in the next iteration
                    fading = false; // Reset FADEOUT flag
                    if (self.fadeInTime > 0)
                        self.fadeIn(self.context.currentTime + self.fadeInTime);
                }
            }
        }, 20);
    }

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

function addDisplay(id, launch) {
    if (id < 0)
        return;
    
    console.log("Displays: " + prodData.displayList);
    // Use the next available id if none is provided
    if (!id) { 
        for (var i = 1; i <= prodData.displayList.length + 1; i++) {
            if (!prodData.displayList[i - 1] || i !== prodData.displayList[i - 1]) {
                id = i;
                break;
            }
        }
    }
    launch = (typeof launch === "undefined") ? true : launch;
    
    // Check if display menu entries already exist
    if (document.getElementById("lli" + id)) {
        launchDisplay(id);
        onscreenInfo("Display " + id + " already exists. Launching...");
        return;
    } else {
        addDisplayHTMLEntries(id);

        // Insert into display list (ordered)
        var index = prodData.displayList.indexOf(id + 1);
        if (prodData.displayList.includes(id)) {
            ;
        } else if (index !== -1) {
            prodData.displayList.splice(index, 0, id);
        } else {
            prodData.displayList.push(id);
        }
    }
    
    // Create display object
    displays[id] = {};
    displays[id].id = id;
    
    // Launch display if applicable
    if (launch) {
        launchDisplay(id);
    }
    
    setSavedIndicator(false);
}

// Add menu entries to DOM
function addDisplayHTMLEntries(id) {
    var remove = document.getElementById("removeList");
    var launch = document.getElementById("launchList");
    var close = document.getElementById("closeList");
    var avmute = document.getElementById("avmuteList");
    var rli = document.createElement("li");
    var lli = document.createElement("li");
    var cli = document.createElement("li");
    var avli = document.createElement("li");

    rli.id = "rli" + id;
    lli.id = "lli" + id;
    cli.id = "cli" + id;
    avli.id = "avli" + id;
    rli.innerHTML = "<a href=\"javascript:void(0);\" onclick=\"removeDisplay(" + id + ")\">Display " + id + "</a>";
    lli.innerHTML = "<a href=\"javascript:void(0);\" onclick=\"launchDisplay(" + id + ")\">Display " + id + "</a>";
    cli.innerHTML = "<a href=\"javascript:void(0);\" onclick=\"closeDisplay(" + id + ")\">Display " + id + "</a>";
    avli.innerHTML = "<a href=\"javascript:void(0);\" onclick=\"toggleAvMute(" + id + ")\">Display " + id + "</a>";

    remove.appendChild(rli);
    launch.appendChild(lli);
    close.appendChild(cli);
    avmute.appendChild(avli);

    console.log("Added Display " + id + ".");
}

function clearDisplayHTMLEntries() {
    var remove = document.getElementById("removeList");
    var launch = document.getElementById("launchList");
    var close = document.getElementById("closeList");
    var avmute = document.getElementById("avmuteList");
    var elems = remove.getElementsByTagName("li");

    var len = elems.length;

    // Remove each li but the first (first is usually "All Displays")
    for (var i = 1; i < len; i++) {
        elems[1].parentNode.removeChild(elems[1]);
    }

    elems = launch.getElementsByTagName("li");
    for (var i = 1; i < len; i++) {
        elems[1].parentNode.removeChild(elems[1]);
    }

    elems = close.getElementsByTagName("li");
    for (var i = 1; i < len; i++) {
        elems[1].parentNode.removeChild(elems[1]);
    }

    // Leave first 2 entries: 0 is mute all, 1 is unmute all
    elems = avmute.getElementsByTagName("li");
    for (var i = 2; i < len; i++) {
        elems[1].parentNode.removeChild(elems[1]);
    }
}

function removeDisplay(id) {

    closeDisplay(id);

    var lli = document.getElementById("lli" + id);
    var cli = document.getElementById("cli" + id);
    var rli = document.getElementById("rli" + id);
    var avli = document.getElementById("avli" + id);

    lli.parentNode.removeChild(lli);
    cli.parentNode.removeChild(cli);
    rli.parentNode.removeChild(rli);
    avli.parentNode.removeChild(avli);

    console.log(prodData.displayList.indexOf(id));
    prodData.displayList.splice(prodData.displayList.indexOf(id), 1); // Remove from display list
    console.log(prodData.displayList);

    console.log("Removed Display " + id + ".");
    setSavedIndicator(false);
}

function removeAllDisplays(silent) {
    if (!silent && !confirm("Remove ALL displays from the current production?"))
        return;

    var len = prodData.displayList.length; // Queried length will shrink as displays are removed
    for (var i = 1; i <= len; i++) {
        displays[i].window.removeEventListener('beforeunload', displays[i].bfunloadhandler);
        removeDisplay(i);
    }
}

function launchDisplay(id) {
    if (id < 0)
        return;
        
    // Focus display if already open
    if (displays[id].window && !displays[id].window.closed) {
        displays[id].window.focus();
        onscreenInfo("Display " + id + " is already active.");
        return;
    }

    // Set content flag
    displays[id].hasActiveContent = false;
    
    // Create and open display window
    displays[id].window = window.open("", "", "width=450, height=250, toolbar=no, menubar=no, scrollbars=no, resizable=yes, location=no, directories=no, status=no");
    
    var win = displays[id].window;
    var iframe = win.document.createElement("iframe");
    
    // Window instructions, styling, and script
    var s = (userConfig.CUES_BEFORE_FULLSCREEN > 1 ? "s" : "");
    win.document.write("<p>Drag this window onto <b>Display " + id + "</b>.</p>");
    win.document.write("<p>" + userConfig.CUES_BEFORE_FULLSCREEN + " cue" + s + " before the display is needed, the content window below will request fullscreen access. Upon triggering, visual content will appear in the fullscreen window. Content will not display if this window is closed or fullscreen access has not been allowed!</p><br>");
    if (userConfig.CUES_BEFORE_FULLSCREEN >= 0) {
        win.document.write("<button onclick=\"initiateFullscreen(document.getElementsByTagName('iframe')[0])\">Test fullscreen access</button>");
    } else {
        win.document.write("<button onclick=\"initiateFullscreen(document.getElementsByTagName('iframe')[0])\">Enable fullscreen</button>");
    }
    win.document.write("<p>The number of cues between fullscreen access and actual content can be set in Display > Settings.</p><br>");
    win.document.write("Content window: <br>");
    win.document.write("<script src=\"js/display.js\"></script>");
    win.document.write("<script> document.onkeydown = window.opener.keyHandler; </script>"); // Pass keystrokes from the display window to the main production window
    win.document.body.appendChild(iframe);
    win.document.write("<script> document.getElementsByTagName('iframe')[0].contentWindow.document.onkeydown = window.parent.opener.keyHandler; </script>"); // Pass keystrokes from the content window to the main production window
    
    // Apply styles
    iframe.contentWindow.document.head.innerHTML = "<link href=\"css/display.css\" rel=\"stylesheet\" type=\"text/css\">";
    iframe.contentWindow.document.body.classList.add("active");

    // Store frame for later reference when adding content
    displays[id].iframe = iframe;
    
    // Warning before close to prevent accidental closure
    // Handling function is stored so that it can be unbound when programatically closing a display
    win.addEventListener("beforeunload", displays[id].bfunloadhandler = function(event) {
        var msg = "Are you sure you want to close this display? \nIf closed, visual content will not display.";
        
        event.returnValue = msg;
        return msg;
    });

    console.log("Launched Display " + id + ".");
}

function launchAllDisplays() {
    for (var i = 1; i <= prodData.displayList.length; i++) {
        launchDisplay(i);
    }
}

function closeDisplay(id) {
    if (displays[id] && !displays[id].window.closed) {
        displays[id].window.close();
        console.log("Closed Display " + id + ".");
		return true;
    } else {
        // Let this be silent
        //onscreenInfo("Display " + id + " is already closed.");
    }
}

function closeAllDisplays(silent) {
    if (!silent && !confirm("Close all displays?"))
        return false;

    for (var i = 1; i <= prodData.displayList.length; i++) {
        displays[i].window.removeEventListener('beforeunload', displays[i].bfunloadhandler);
        closeDisplay(i);
    }
	
	return true;
}

// Pre load files and open fullscreen display before content needs to be shown
function primeDisplay(id, content) {
    if (!displays[id] || displays[id].window.closed) {
        onscreenAlert("Display " + id + " is not active for Cue #" + content.id + ".");
        return false;
    }
    
    var iframe = displays[id].iframe; // Local reference to frame
    
    displays[id].window.focus(); // Bring window forward
    iframe.contentWindow.document.body.appendChild(content);
    
    initiateFullscreen(iframe);

    return true;
}

function initiateFullscreen(iframe) {
    var requestFullScreen = iframe.requestFullScreen || iframe.mozRequestFullScreen || iframe.webkitRequestFullScreen;
    if (requestFullScreen) {
        requestFullScreen.bind(iframe)();
    } else {
        onscreenAlert("Fullscreen access is not supported.");
        alert("Fullscreen access is not supported.");
    }
}

function revealBodyContent(id) {
    if (!displays[id] || displays[id].window.closed) {
        onscreenAlert("Display " + id + " is not active.");
        return false;
    }
    
    displays[id].window.focus();
    displays[id].iframe.contentWindow.document.body.classList.add("active");
	
	return true;
}

function hideBodyContent(id) {
    if (!displays[id] || displays[id].window.closed) {
        onscreenAlert("Display " + id + " is not active.");
        return false;
    }
    
    displays[id].iframe.contentWindow.document.body.classList.remove("active");
	
	return true;
}

// AV mute function
function toggleAvMute(id) {
    if (!displays[id] || displays[id].window.closed) {
        onscreenAlert("Display " + id + " is not active.");
        return false;
    }

    displays[id].iframe.contentWindow.document.body.classList.toggle("active");
	
	return true;
}

function muteAllDisplays() {
    for (var id = 1; id <= prodData.displayList.length; id++) {
        if (!displays[id] || displays[id].window.closed) {
            onscreenAlert("Display " + id + " is not active.");
            continue;
        }

        displays[id].iframe.contentWindow.document.body.classList.remove("active");
    }
}

function unmuteAllDisplays() {
    for (var id = 1; id <= prodData.displayList.length; id++) {
        if (!displays[id] || displays[id].window.closed) {
            onscreenAlert("Display " + id + " is not active.");
			continue;
        }

        displays[id].iframe.contentWindow.document.body.classList.add("active");
    }
}

// Sets the opacity of the element specified by elemId to 1
// Default id for elements is their cue number
function revealContent(displayId, elemId) {
    if (!displays[displayId] || displays[displayId].window.closed) {
        onscreenAlert("Display " + displayId + " is not active.");
        activeCues[elemId].stop(); // Stop cue
        return false;
    }

    displays[displayId].window.focus();

    // Fade out all other content
    var elems = displays[displayId].iframe.contentWindow.document.getElementsByClassName("elem");
    for (var i = 0; i < elems.length; i++) {
        //elems[i].classList.remove("active");
    }

    // Show new content
    displays[displayId].iframe.contentWindow.document.getElementById(elemId).classList.add("active");
	
	return true;
}

// Sets the opacity of the element specified by elemId to 0
// Default id for elements is their cue number
function hideContent(displayId, elemId) {
    if (!displays[displayId] || displays[displayId].window.closed) {
        // Let this be silent
        //onscreenAlert("Display " + displayId + " is not active.");
        // Calling cue.stop() would create an infinite loop
        return false;
    }
    var elem = displays[displayId].iframe.contentWindow.document.getElementById(elemId);
    if (elem) {
        elem.classList.remove("active");
    }
	
	return true;
}