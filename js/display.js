var displays = {};
var nextDisplayId = 1;
var cuesBeforeBlackout = 1; // TODO: editable in display settings
var fadeInTime = 1;

class ImageCue {
    
    constructor(context, cueNum) {
        this.context = context;
        this.cueNum = cueNum;

        this.image = new Image();

        this.paused = false;
        this.pausePoint = 0;
    }
    
    init() {
        this.image.className = "elem";
        this.image.src = filer.pathToFilesystemURL(this.filename);
        this.image.id = this.cueNum;
        primeDisplay(this.display, this.cueNum, this.image); // Pre load file
    }
    
    syncParams() {
        this.filename = getFilename(this.cueNum);
        this.display = getOutput(this.cueNum);
        this.fadeInTime = getFadeIn(this.cueNum);
        this.fadeOutTime = getFadeOut(this.cueNum);
        this.duration = getCueDurInSecs(this.cueNum);
        this.action = getAction(this.cueNum);
        this.targetId = getTargetId(this.cueNum);
        this.timeBased = getIsTimeBased(this.cueNum);
    }

    play() {

        var self = this;
        this.syncParams();
        this.image.onload = function() {
            console.log("loaded");
            //this.image.style.transitionDuration = self.fadeInTime;
            self.image.style.transition = "opacity " + self.fadeInTime + "s ease-in-out";
            console.log(self.image);

            revealContent(self.display, self.cueNum);
            self.startTimer();
        };
        this.init();
        console.log(this.image);

        if (this.image.src === "" || !this.image.src) {
            onscreenAlert("File " + filename + " not found for Display #" + id + "."); // Alert main show window
            return;
        }

        if (!displays[this.display].iframe.contentWindow.document.body.classList.contains("active")) {
            onscreenAlert("Warning: Display #" + this.display + " is AV muted.", 5);
        }
    }

    stop() {
        clearInterval(this.intervalId);
        this.image.style.transition = ""; // Remove fades
        hideContent(this.display, this.cueNum);
        this.image.parentNode.removeChild(this.image); // Remove from display window
        console.log("Stopped Cue #" + this.cueNum + ".");

        setElapsed(this.cueNum, null);
        setRemaining(this.cueNum, null);
        resetProgressBar(this.cueNum);
        delete activeCues[this.cueNum];
        console.log("Removed Cue #" + this.cueNum + " from the currently playing list.");
        
        checkButtonLock();

    }

    pause() {
        
    }

    resume() {
        
    }

    fade(length) {
        if (length < 0)
            return;

        this.image.style.transition = "opacity " + length + "s ease-in-out";
        hideContent(this.display, this.cueNum);
    }

    fadeIn(time) {
        var length = (time) ? time - this.context.currentTime : this.fadeOutTime;
        
        this.image.style.transition = "opacity " + length + "s ease-in-out";
        revealContent(this.display, this.cueNum);
    }
    

    fadeOut(time) {
        var length = (time) ? time - this.context.currentTime : this.fadeOutTime;
        
        this.image.style.transition = "opacity " + length + "s ease-in-out";
        hideContent(this.display, this.cueNum);
    }

    startTimer() {
        var self = this;
        var fading = false;
        var contextStart = this.context.currentTime;
        var contextStop = contextStart + this.duration;
        var contextFade = contextStop - this.fadeOutTime;
        
        console.log("Image started at: " + contextStart);
        console.log("Image ends at: " + contextStop);
        
        this.intervalId = setInterval(function() {
            self.updateProgressDisplay(contextStart);
            
            if (!fading && self.fadeOutTime > 0 && self.context.currentTime >= contextFade) {
                fading = true;

                self.fadeOut(contextFade + self.fadeOutTime);

                // Handle FP and FA actions
                if (self.action.includes("F")) {
                    advance(self.targetId, self.action);
                }
            }

            if (context.currentTime >= contextStop) {
                // Handle EA, EP, and 0s F actions
                if (self.action.includes("E") || (self.fadeOutTime === 0 && self.action.includes("F")))
                    advance(self.targetId, self.action);

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

class VideoCue {
    
    constructor(context, cueNum) {
        this.context = context;
        this.cueNum = cueNum;
        this.globalPanNode = globalPanNode;
        this.globalGainNode = globalGainNode;
    }
    
    init() {
        // Create media element
        this.source = this.context.createBufferSource();
        this.panNode = this.context.createStereoPanner();
        this.gainNode = this.context.createGain();

        this.source.connect(this.panNode);
        this.panNode.connect(this.gainNode);
        this.gainNode.connect(this.globalPanNode);

        this.panNode.pan.value = this.pan;
        this.gainNode.gain.value = this.gain;

        this.paused = false;
        this.pausePoint = 0;
    }

    play() {
        
    }

    stop() {
        
    }

    fade(length) {
        
    }

    fadeIn() {
        
    }
    
    fadeOut() {
        
    }
}

function addDisplay(id, launch) {
    if (id < 0)
        return;
    
    console.log(prodData.displayList);
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
    console.log("")
    if (document.getElementById("lli" + id)) {
        launchDisplay(id);
        onscreenInfo("Display #" + id + " already exists. Launching...");
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
    var rli = document.createElement("li");
    var lli = document.createElement("li");
    var cli = document.createElement("li");

    rli.id = "rli" + id;
    lli.id = "lli" + id;
    cli.id = "cli" + id;
    rli.innerHTML = "<a href=\"javascript:void(0);\" onclick=\"removeDisplay(" + id + ")\">Display " + id + "</a>";
    lli.innerHTML = "<a href=\"javascript:void(0);\" onclick=\"launchDisplay(" + id + ")\">Display " + id + "</a>";
    cli.innerHTML = "<a href=\"javascript:void(0);\" onclick=\"closeDisplay(" + id + ")\">Display " + id + "</a>";

    remove.appendChild(rli);
    launch.appendChild(lli);
    close.appendChild(cli);

    console.log("Added Display #" + id + ".");
}

function clearDisplayHTMLEntries() {
    var remove = document.getElementById("removeList");
    var launch = document.getElementById("launchList");
    var close = document.getElementById("closeList");
    var elems = remove.getElementsByTagName("li");

    var len = elems.length;

    // Remove each li but the first (first is all)
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
}

function removeDisplay(id) {

    closeDisplay(id);

    var launch = document.getElementById("launchList");
    var close = document.getElementById("closeList");
    var lli = document.getElementById("lli" + id);
    var cli = document.getElementById("cli" + id);
    var rli = document.getElementById("rli" + id);

    lli.parentNode.removeChild(lli);
    cli.parentNode.removeChild(cli);
    rli.parentNode.removeChild(rli);

    console.log(prodData.displayList.indexOf(id));
    prodData.displayList.splice(prodData.displayList.indexOf(id), 1); // Remove from display list
    console.log(prodData.displayList);

    console.log("Removed Display #" + id + ".");
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
        onscreenInfo("Display #" + id + " is already active.");
        return;
    }

    // Set content flag
    displays[id].hasActiveContent = false;
    
    // Create and open display window
    displays[id].window = window.open("", "", "width=450, height=250, toolbar=no, menubar=no, scrollbars=no, resizable=yes, location=no, directories=no, status=no");
    
    var win = displays[id].window;
    var iframe = win.document.createElement("iframe");
    
    // Window instructions, styling, and script
    var s = (cuesBeforeBlackout > 1 ? "s" : "");
    win.document.write("<p>Drag this window onto <b>Display #" + id + "</b>.</p>");
    win.document.write("<p>" + cuesBeforeBlackout + " cue" + s + " before the display is needed, the content window below will request fullscreen access. Upon triggering, visual content will appear in the fullscreen window. Content will not display if this window is closed or fullscreen access has not been allowed!</p><br>");
    if (cuesBeforeBlackout >= 0) {
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

    console.log("Launched Display #" + id + ".");
}

function launchAllDisplays() {
    for (var i = 1; i <= prodData.displayList.length; i++) {
        launchDisplay(i);
    }
}

function closeDisplay(id) {
    if (displays[id] && !displays[id].window.closed) {
        displays[id].window.close();
        console.log("Closed Display #" + id + ".");
    } else {
        //onscreenInfo("Display #" + id + " is already closed.");
    }
}

function closeAllDisplays(silent) {
    if (!silent && !confirm("Close all displays?"))
        return;

    for (var i = 1; i <= prodData.displayList.length; i++) {
        displays[i].window.removeEventListener('beforeunload', displays[i].bfunloadhandler);
        closeDisplay(i);
    }
}

// Pre load files and open fullscreen display before content needs to be shown
function primeDisplay(id, cueNumber, content) {
    if (!displays[id] || displays[id].window.closed) {
        onscreenAlert("Display #" + id + " is not active.");
        return;
    }
    
    var iframe = displays[id].iframe; // Local reference to frame
    
    displays[id].window.focus(); // Bring window forward
    iframe.contentWindow.document.body.appendChild(content);
    
    initiateFullscreen(iframe);
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
        onscreenAlert("Display #" + id + " is not active.");
        return;
    }
    
    displays[id].window.focus();
    displays[id].iframe.contentWindow.document.body.classList.add("active");
}

function hideBodyContent(id) {
    if (!displays[id] || displays[id].window.closed) {
        onscreenAlert("Display #" + id + " is not active.");
        return;
    }
    
    displays[id].iframe.contentWindow.document.body.classList.remove("active");
}

// AV mute function
function toggleBodyContent(id) {
    if (!displays[id] || displays[id].window.closed) {
        onscreenAlert("Display #" + id + " is not active.");
        return;
    }

    displays[id].iframe.contentWindow.document.body.classList.toggle("active");
}

// Sets the opacity of the element specified by elemId to 1
// Default id for elements is their cue number
function revealContent(displayId, elemId) {
    if (!displays[displayId] || displays[displayId].window.closed) {
        onscreenAlert("Display #" + displayId + " is not active.");
    }

    displays[displayId].window.focus();

    // Fade out all other content
    var elems = displays[displayId].iframe.contentWindow.document.getElementsByClassName("elem");
    for (var i = 0; i < elems.length; i++) {
        elems[i].classList.remove("active");
    }

    // Show new content
    displays[displayId].iframe.contentWindow.document.getElementById(elemId).classList.add("active");
}

// Sets the opacity of the element specified by elemId to 0
// Default id for elements is their cue number
function hideContent(displayId, elemId) {
    if (!displays[displayId] || displays[displayId].window.closed) {
        onscreenAlert("Display #" + displayId + " is not active.");
    }

    displays[displayId].iframe.contentWindow.document.getElementById(elemId).classList.remove("active");
}