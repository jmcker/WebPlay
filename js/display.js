var displays = {};
var nextDisplayId = 1;
var cuesBeforeBlackout = 1; // TODO: editable in display settings
var fadeInTime = 1;

class Image {
    
    constructor(context, cueNum) {
        this.context = context; // Used for timing
        this.cueNum = cueNum;
    }
    
    init() {


    }
    
    syncParams() {
        this.display = getOutput(this.cueNum);
        this.fadeInTime = getFadeIn(this.cueNum);
        this.fadeOutTime = getFadeOut(this.cueNum);
        this.cueDuration = getCueDuration(this.cueNum);
        this.action = getAction(this.cueNum);
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

class Video {
    
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
function primeDisplay(id, filename, cueNumber) {
    if (!displays[id] || displays[id].window.closed) {
        onscreenAlert("Display #" + id + " is not active.");
        console.log("Display #" + id + " is not active.");
        return;
    }
    
    var fsUrl = "";
    if (filename) {
        fsUrl = filer.pathToFilesystemURL(filename);
        if (fsUrl === "" || !fsUrl)
            onscreenAlert("File " + filename + " not found for Display #" + id + "."); // Alert main show window
    }
    
    var iframe = displays[id].iframe; // Local reference to frame
    
    displays[id].window.focus(); // Bring window to front
    iframe.contentWindow.document.body.innerHTML += "<img id=\"" + cueNumber + "\" src=\"" + fsUrl + "\" class=\"elem\">";
    console.log(iframe.contentWindow);
    // TODO: look into working around cross-domain problems for iframes
    //address = "https://stackoverflow.com/";
    //iframe.src = address;
    initiateFullscreen(iframe);
}

function initiateFullscreen(iframe) {
    var requestFullScreen = iframe.requestFullScreen || iframe.mozRequestFullScreen || iframe.webkitRequestFullScreen;
    if (requestFullScreen) {
        requestFullScreen.bind(iframe)();
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
// Default id for elements is their filename
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
    // Non-active elements, whether used or unused, remain in DOM
    // TODO: should they be removed? 

    // Show new content
    displays[displayId].iframe.contentWindow.document.getElementById(elemId).classList.add("active");
    //displays[displayId].iframe.contentWindow.document.getElementById(elemId).style.opacity = 1;
}

// Sets the opacity of the element specified by elemId to 0
// Default id for elements is their filename
function hideContent(displayId, elemId) {
    if (!displays[displayId] || displays[displayId].window.closed) {
        onscreenAlert("Display #" + displayId + " is not active.");
    }

    displays[displayId].iframe.contentWindow.document.getElementById(elemId).classList.remove("active");
}




// For reference
function readFilexxxx(i) {

    var entry = entries[i];

    try {
        filer.open(entry.name, function(file) {
            
            togglePreview(true); // Show the preview 

            fileInfo = document.getElementById("file_preview_info");
            fileInfo.rows[0].innerHTML = ["<td><b>", file.name, "</b></td>"].join("");
            fileInfo.rows[1].innerHTML = ["<td>Type: ", (file.type ? file.type : Util.getFileExtension(file.name) ? Util.getFileExtension(file.name) : ""), "</td><td>Size: ", (file.size / 1024 / 1024).toFixed(2), " MB</td>"].join("");
            fileInfo.rows[2].innerHTML = ["<td>Last modified: ", file.lastModifiedDate.toLocaleDateString(), "</td>"].join("");
            fileInfo.rows[3].innerHTML = "";

            if (file.type.match(/audio.*/)) {
                var player = document.createElement("audio");
                player.controls = true;
                player.style.width = "75%";
                player.style.paddingTop = "20px"
                player.src = entry.toURL();

                filePreview.appendChild(player);

                player.load();
                player.play();
                
            } else if (file.type.match(/video.*/)) {
                var player = document.createElement("video");
                player.controls = true;
                player.style.width = "75%";
                player.src = entry.toURL();
                
                filePreview.appendChild(player);
                
                player.load();
                player.play();
                
            } else if (file.type.match(/text.*/) || file.type.match(/application\/pdf/)) {
                var iframe = document.createElement("iframe");
                iframe.style.width = "98%";
                iframe.style.height = "97%";
                iframe.style.minHeight = "350px";
                
                // Display a full preview of the cue list file
                if (file.name === "cue_list_content.html") {
                    // Plain text toggle
                    fileInfo.rows[3].innerHTML = "<td><button onclick=\"togglePlainTextPreview(); readFile(" + i + ")\">Toggle: HTML / Plain Text</button></td>";
                    //fileInfo.rows[3].innerHTML = "<td><input type=\"radio\" name=\"prev\" checked>HTML <input type=\"radio\" name=\"prev\">Plain Text"; // Needs onchange function
                    //fileInfo.rows[3].innerHTML = "<td><a href=\"javascript:void(0);\" onclick=\"togglePlainTextPreview(false); readFile(" + i + ")\">HTML</a> / <a href=\"javascript:void(0);\" onclick=\"togglePlainTextPreview(true); readFile(" + i + ")\">Plain Text</a></td>";
                    
                    // Cue list preview
                    var html = "<table id=\"cue_list\" class=\"cue-list\" style=\"top: 0; left: 0;\">";
                    var css = "<link href=\"css/style.css\" rel=\"stylesheet\" type=\"text/css\">"
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        if (!plainTextPreview) {
                            html += e.target.result;
                            html += "</table>";
                            // Also possible to use the srcdoc attribute
                            iframe.onload = function() {
                                iframe.contentWindow.document.head.innerHTML = css;
                                iframe.contentWindow.document.body.innerHTML = html;
                            }
                            filePreview.appendChild(iframe);
                        } else {
                            var textarea = document.createElement("textarea");
                            textarea.style.width = "98%";
                            textarea.style.height = "350px";
                            textarea.textContent = e.target.result;
                            filePreview.appendChild(textarea);
                        }
                    };
                    reader.readAsText(file);
                    
                } else {
                    iframe.src = entry.toURL();
                    filePreview.appendChild(iframe);
                }

            } else if (file.type.match(/image.*/)) {

                var img = new Image();
                img.className = "hidden";
                img.onload = function() {
                    // TODO: implement fade in
                    img.className = "";
                }
                img.style.width = "80%";
                img.src = entry.toURL();

                filePreview.appendChild(img);

            } else if (PREVIEWABLE_FILES.indexOf(Util.getFileExtension(file.name)) != -1) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var textarea = document.createElement("textarea");
                    textarea.style.width = "98%";
                    textarea.style.height = "350px";
                    textarea.textContent = e.target.result;
                    filePreview.appendChild(textarea);
                };
                reader.readAsText(file);
            } else {
                console.log("No preview available -- file type: " + file.type + ", extension: " + Util.getFileExtension(file.name));
                var p = document.createElement("p");
                p.textContent = "No preview."
                filePreview.appendChild(p);
            }

        }, onError);
    } catch (e) {
        onError(e);
    }
}