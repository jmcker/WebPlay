// Declare and initialize user data
// Data is replaced when user config file is opened
var userConfig = {};
userConfig.MAX_UNDO_LEVEL = 25;
userConfig.PROGRESS_BAR_WARNING_TIME = 5;
userConfig.GLOBAL_AUDIO_FADE_TIME = 4.0;
userConfig.GLOBAL_VISUAL_FADE_TIME = 1;
userConfig.CUES_BEFORE_FULLSCREEN = 3;

// Declare and initialize production data
// Data is replaced when production config file is opened
var prodData = {};
prodData.cueListContent = "";
prodData.prodStyle = "";
prodData.displayList = [];
prodData.autoOpenDisplay = true;
prodData.cuesBeforeAutoOpen = 3;
prodData.autoCloseDisplay = true;
prodData.cuesBeforeAutoClose = 3;

var currentCue = 0;
var currentlyEditing = 0;
var cueListLength = 0;
var PROGRESS_BAR_WARNING_TIME = 5;
var estartmaximum;
var estopminimum;
var estopmaximum;
var isSaved;
var undoStack = [];
var redoStack = [];

keyListeners(false, false, false, false);
openFS();
createCue("blank_audio");
currentCue = 1;
select(currentCue);




function onscreenAlert(text, expiration) {
    expiration = expiration || 3;
    var bar = document.getElementById("alert_bar");
    var str = "<br>" + text;
    bar.innerHTML += str; // Append message
    setTimeout(function() {
        bar.innerHTML = bar.innerHTML.replace(str, ""); // Replace only this message after expiration
    }, expiration * 1000);
    console.warn(text);
}

function onscreenInfo(text, expiration) {
    expiration = expiration || 3;
    var bar = document.getElementById("alert_bar");
    var str = "<br><span style=\"color: black;\">" + text + "</span>";
    bar.innerHTML += str; // Append message
    setTimeout(function() {
        bar.innerHTML = bar.innerHTML.replace(str, ""); // Replace only this message after expiration
    }, expiration * 1000);
    console.info(text);
}

function show(id) {
    var element = document.getElementById(id);
    element.className = element.className.replace("hidden", "visible");
}

function hide(id) {
    var element = document.getElementById(id);
    element.className = element.className.replace("visible", "hidden");
}

function save(element) {
    var id = parseInt(element.id);
    var display = document.getElementById(id + 1);
    display.innerHTML = element.value;
}

function openTBox(element) {
    var id = parseInt(element.id);
    element.className = element.className.replace("hidden", "open");
    
    // Restore the input to the the value stored in the display div
    if (element.parentElement.className.includes("notes")) {
        element.value = getNotes(element.parentElement.parentElement.id);
    } else if (element.parentElement.className.includes("desc")) {
        element.value = getDesc(element.parentElement.parentElement.id);
    }
    
    hide(id + 1); // Hide display element to show edit box
    element.parentElement.onclick = ""; // Clear onclick handler to allow user to use mouse in textbox
}

function close(element) {
    var id = parseInt(element.id);
    element.className = element.className.replace("open", "hidden");
    show(id + 1); // Show display element in place of edit box
    element.parentElement.setAttribute('onclick', 'edit(' + id + ')'); // Restore onclick handler
}

function saveAll() {
    var opened = document.getElementsByClassName("open");
    for (var i = 0; i < opened.length; i++) {
        if (opened[i].value !== document.getElementById(parseInt(opened[i].id) + 1).innerHTML) { 
            setSavedIndicator(false); // If the user actually made a change, mark the show as unsaved
            updateUndoRedoStack();
        } 
        save(opened[i]);
    }
}

function closeAll() {
    saveAll();
    closeTitle(false);
    var opened = document.getElementsByClassName("open");
    for (var i = 0; i < opened.length; i++) {
        close(opened[i]);
    }
    keyListeners(false, false, false, false);
}

function edit(id) {
    closeAll();
    var element = document.getElementById(id);
    openTBox(element);
    element.select();
    keyListeners(true, false, false, false);
}

function editTitle() {
    show("edit_title");
    show("save_title");
    show("cancel_title");
    hide("display_title");
    hide("saved_indicator");

    var display = document.getElementById("display_title");
    var text = document.getElementById("edit_title");
    text.value = display.innerHTML;
    text.focus();

    keyListeners(false, true, false, false);
}

function setTitle(title) {
    document.getElementById("display_title").innerHTML = title;
}

function getProdName() {
    return document.getElementById("display_title").innerHTML.trim();
}

function closeTitle(saveChanges) {
    
    var text = document.getElementById("edit_title");
    var display = document.getElementById("display_title");
    if (saveChanges) {
        if (text.value == "") {
            return;
        } else {

            // Check if the production name already exists
            filer.exists("/" + text.value, function() {
        
                alert("\"" + text.value + "\" already exists.");
                text.value = display.innerHTML;
                return;

            }, function() {

                // Update production file, production directory, display text, and window hash
                renameFile("/" + display.innerHTML + "/" + display.innerHTML + ".wpjs", ".", text.value + ".wpjs", function() {

                    // Rename parent folder after production file has been successfully renamed
                    renameFile("/" + display.innerHTML, "/", text.value, function() {

                        // Move into the renamed folder after it has been successfully renamed
                        filer.cd("/" + text.value, function() {

                            onscreenInfo("Successfully renamed production \"" + display.innerHTML + "\" to \"" + text.value + "\"");

                            // Wait to change the text values until everything completes successfully
                            display.innerHTML = text.value;
                            window.location.hash = text.value;
                
                        }, function() {
                            alert("An error occurred while renaming the production. Please manually check or change the name of the production folder and the .wpjs file.");
                            return;
                        });
                    });
                });
            
            });
        }
    }

    hide("edit_title");
    hide("save_title");
    hide("cancel_title");
    show("display_title");
    if (!isSaved) {
        show("saved_indicator"); // Restore saved indicator value (isSaved is global)
    }
    keyListeners(false, false, false, false);
}

function setSavedIndicator(status) {
    
    if (status) {
        hide("saved_indicator");
        isSaved = true;
    } else {
        show("saved_indicator");
        isSaved = false;
    }
}

// Handle undo/redo stack every time a change is made
function updateUndoRedoStack() {
    
    redoStack.length = 0; // Clear redo stack after change is made
    undoStack.push(getCueListHTML()); // Push cueListContent
        
    // Remove the oldest from undo if the max has been surpassed
    if (undoStack.length > userConfig.MAX_UNDO_LEVEL) {
        undoStack.shift();
    }

}

function editCue(cueNum) {
    cueNum = cueNum || currentCue;
    select(cueNum);
    currentlyEditing = cueNum;
    var ctype = getType(cueNum);

    closeAll();
    checkButtonLock(currentlyEditing);
    
    // Stop preview if revert button is clicked
    if (typeof previewing !== "undefined" && previewing) {
        previewing.stop(0);
    }

    var etitle = document.getElementById("edit_menu_title");
    var enotes = document.getElementById("edit_notes");
    var edesc = document.getElementById("edit_desc");
    var evol = document.getElementById("vol_in");
    var epan = document.getElementById("pan_in");
    var epitch = document.getElementById("pitch_in");
    var eaction = document.getElementById("edit_action");
    var etarget = document.getElementById("edit_target");
    var efile = document.getElementById("edit_file");
    var efilename = document.getElementById("edit_filename");
    var efilelength = document.getElementById("edit_file_length");
    var efilepath = document.getElementById("edit_filepath");
    var efadein = document.getElementById("edit_fade_in");
    var efadeout = document.getElementById("edit_fade_out");
    var eloops = document.getElementById("edit_loops");
    var eoutput = document.getElementById("edit_output");
    var edisplay = document.getElementById("edit_display");
    var estartmin = document.getElementById("edit_start_pos_min");
    var estartsec = document.getElementById("edit_start_pos_sec");
    var estartms = document.getElementById("edit_start_pos_ms");
    var estopmin = document.getElementById("edit_stop_pos_min");
    var estopsec = document.getElementById("edit_stop_pos_sec");
    var estopms = document.getElementById("edit_stop_pos_ms");
    var preview = document.getElementById("edit_preview");
    var save = document.getElementById("edit_save");
    var cancel = document.getElementById("edit_cancel");
    var revert = document.getElementById("edit_revert");

    etarget.innerHTML = "<option value=\"0\">Next Cue</option>";
    for (i = 1; i <= cueListLength; i++) {
        if (i !== currentlyEditing) {
            var option = document.createElement("option");
            option.value = i;
            option.text = i + " - " + getDesc(i);
            etarget.add(option);
        }
    }
    clearEditStartPos();
    clearEditStopPos();
    efile.value = "";

    enotes.disabled = false; // Reset from memo
    eloops.disabled = false; // Reset from image
    show("edit_param_table3_audio_controls"); // Reset from image

    if (ctype === "memo") {
        hide("edit_param_table2");
        hide("edit_param_table3");
        hide("edit_param_table4");
        hide("edit_param_table5");
        hide("edit_param_table6");
        hide("edit_preview");

        etitle.innerHTML = "Edit Cue - Memo";
        enotes.disabled = true;
        edesc.value = getDesc(cueNum);
        
        
    } else if (ctype === "wait") {
        hide("edit_param_table2");
        hide("edit_param_table3");
        show("edit_param_table4");
        hide("edit_param_table5");
        hide("edit_param_table6");
        hide("edit_preview");
        
        var emin = document.getElementById("wait_min_in");
        var esec = document.getElementById("wait_sec_in");
        var ems = document.getElementById("wait_ms_in");
        var dur = getCueDurAsArray(cueNum);

        etitle.innerHTML = "Edit Cue - " + getDesc(cueNum);
        enotes.value = getNotes(cueNum);
        edesc.value = getDesc(cueNum);
        eaction.value = getAction(cueNum);
        etarget.value = getTargetId(cueNum);
        setEditTable4Dur(dur);
        
        emin.oninput = function() { validateNumberInput(this); };
        emin.onblur = function() { validateNumberInput(this, true); };
        esec.oninput = function() { validateNumberInput(this); };
        esec.onblur = function() { validateNumberInput(this, true); };
        ems.oninput = function() { validateNumberInput(this); };
        ems.onblur = function() { validateNumberInput(this, true); };
        
        
    } else if (ctype === "audio" || ctype === "blank_audio") {
        show("edit_param_table2");
        show("edit_param_table3");
        show("edit_param_table3_audio_controls");
        hide("edit_param_table3_image_controls");
        hide("edit_param_table4");
        hide("edit_param_table5");
        hide("edit_param_table6");
        show("edit_preview");
        show("edit_output");
        hide("edit_display");
        
        var estartmin = document.getElementById("edit_start_pos_min");
        var estartsec = document.getElementById("edit_start_pos_sec");
        var estartms = document.getElementById("edit_start_pos_ms");
        var estopmin = document.getElementById("edit_stop_pos_min");
        var estopsec = document.getElementById("edit_stop_pos_sec");
        var estopms = document.getElementById("edit_stop_pos_ms");

        efile.setAttribute("accept", "audio/*");

        eoutput.innerHTML = "";
        for (i = 1; i <= context.destination.channelCount / 2; i++) {
            var option = document.createElement("option");
            option.value = i;
            option.textContent = "Output " + i;
            option.title = "Channels " + (i * 2 - 1) + "&" + (i * 2);
            eoutput.add(option);
        }

        etitle.innerHTML = "Edit Cue - " + getDesc(cueNum);
        enotes.value = getNotes(cueNum);
        edesc.value = getDesc(cueNum);
        efadein.value = getFadeIn(cueNum);
        efadeout.value = getFadeOut(cueNum);
        eloops.value = getLoops(cueNum);
        eoutput.selectedIndex = getOutput(cueNum) - 1;
        eaction.value = getAction(cueNum);
        etarget.value = getTargetId(cueNum);
        setEditVol(getVol(cueNum));
        setEditPan(getPan(cueNum));
        setEditPitch(getPitch(cueNum));
        setEditStartPos(getStartPosAsArray(cueNum));
        setEditStopPos(getStopPosAsArray(cueNum));

        if (hasFile(cueNum)) {
            efilename.innerHTML = getFilename(cueNum);
            efilepath.value = filer.pathToFilesystemURL(getFilename(cueNum));
            setEditFileLength(getFileDurInSecs(cueNum));
            setEditStartPosMax(getStopPosAsArray(cueNum));
            setEditStopPosMax(getFileDurAsArray(cueNum));
            setEditStopPosMin(getStartPosAsArray(cueNum));
        } else {
            efilename.innerHTML = "";
            efilepath.value = "";
            efile.value = "";
            setEditFileLength(null);
            // Max pos already cleared above
        }

        evol.oninput = function() { setEditVol(evol.value); setLiveCueVol(cueNum, evol.value); };
        evol.ondblclick = function() { setEditVol(0); setLiveCueVol(cueNum, 0); };
        epan.oninput = function() { setEditPan(epan.value); setLiveCuePan(cueNum, epan.value); };
        epan.ondblclick = function() { setEditPan(0); setLiveCuePan(cueNum, 0); };
        epitch.oninput = function() { setEditPitch(epitch.value); setLiveCuePitch(cueNum, epitch.value); };
        epitch.ondblclick = function() { setEditPitch(100); setLiveCuePitch(cueNum, 100); };
        estartmin.oninput = function() { validateNumberInput(this); validateRange("start");};
        estartmin.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estartsec.oninput = function() { validateNumberInput(this); validateRange("start"); };
        estartsec.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estartms.oninput = function() { validateNumberInput(this); validateRange("start"); };
        estartms.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estopmin.oninput = function() { validateNumberInput(this); validateRange("stop"); };
        estopmin.onblur = function() { validateNumberInput(this, true); validateRange("stop"); };
        estopsec.oninput = function() { validateNumberInput(this); validateRange("stop"); };
        estopsec.onblur = function() { validateNumberInput(this, true); validateRange("stop"); };
        estopms.oninput = function() { validateNumberInput(this); validateRange("stop"); };
        estopms.onblur = function() { validateNumberInput(this, true); validateRange("stop"); };
        efile.onchange = function() {
            var filename = efile.files[0].name;
            var type = efile.files[0].type;
            var size = efile.files[0].size;
            console.log("file name: " + filename);
            console.log("file MIME: " + type);
            if (type.indexOf("audio") === -1) {
                onscreenAlert(filename + " is not an audio file. Please try again.");
                efile.value = "";
                return;
            }
            efilename.innerHTML = filename;
            efilepath.value = filename;
            setEditButtonLock(true);
            syncDataFromMediaElement(cueNum, efile.files[0]); // Updates filelength, stop position, and start position maximum
            if (!edesc.value || edesc.value === "Audio Cue") {
                edesc.value = filename; // If no description is present, fill the description with the filename
            }
        };

    } else if (ctype === "control") {
        show("edit_param_table2");
        hide("edit_param_table3");
        hide("edit_param_table4");
        show("edit_param_table5");
        hide("edit_param_table6");
        hide("edit_preview");
        
        var econtrol_action = document.getElementById("edit_control_action");
        var econtrol_target = document.getElementById("edit_control_target");
        var econtrol_param_label = document.getElementById("edit_control_param_label");
        var econtrol_param_value = document.getElementById("edit_control_param_value");
        var econtrol_length_label = document.getElementById("edit_control_length_label");
        var econtrol_length = document.getElementById("edit_control_length");
        var econtrol_volume = document.getElementById("edit_control_volume");
        var econtrol_pan = document.getElementById("edit_control_pan");
        var econtrol_pitch = document.getElementById("edit_control_pitch");
        var econtrol_pos_m = document.getElementById("edit_pos_m");
        var econtrol_pos_s = document.getElementById("edit_pos_s");
        var econtrol_pos_ms = document.getElementById("edit_pos_ms");
        
        etitle.innerHTML = "Edit Cue - " + getDesc(cueNum);
        
        // Populate control target list
        econtrol_target.innerHTML = "<option value=\"0\">Previous Cue</option>";
        for (i = 1; i <= cueListLength; i++) {
            if (i !== currentlyEditing && getType(i) !== "control" && getType(i) !== "memo") {
                var option = document.createElement("option");
                option.value = i;
                option.text = i + " - " + getDesc(i);
                econtrol_target.add(option);
            }
        }

        econtrol_action.oninput = function() {
            hide("edit_control_length");
            hide("edit_control_volume");
            hide("edit_control_pan");
            hide("edit_control_pitch");
            //hide("edit_control_pos");
            
            econtrol_param_label.innerHTML = "";
            econtrol_param_value.innerHTML = "";
            econtrol_length_label.innerHTML = "";
            
            var action = this.value;
            if (action === "cue_fade" || action === "fade_all" || action === "fade_all_prev") {
                econtrol_length_label.innerHTML = "Length:"
                show("edit_control_length"); // Same as volume change to -60 but why not include it
            } else if (action === "vol_change") {
                show("edit_control_volume");
                econtrol_length_label.innerHTML = "Length:"
                show("edit_control_length");
                econtrol_param_label.innerHTML = "Volume:";
                econtrol_volume.oninput();
            } else if (action === "pan_change") {
                show("edit_control_pan");
                econtrol_length_label.innerHTML = "Length:"
                show("edit_control_length");
                econtrol_param_label.innerHTML = "Pan:";
                econtrol_pan.oninput();
            } else if (action === "pitch_change") {
                show("edit_control_pitch");
                econtrol_length_label.innerHTML = "Length:"
                show("edit_control_length");
                econtrol_param_label.innerHTML = "Pitch:";
                econtrol_pitch.oninput();
            } else if (action === "set_position") {
                show("edit_control_pos");
            }
        };
        
        econtrol_volume.oninput = function() {
            econtrol_param_value.innerHTML = this.value + "dB";
        };
        econtrol_pan.oninput = function() {
            econtrol_param_value.innerHTML = this.value;
        };
        econtrol_pitch.oninput = function() {
            econtrol_param_value.innerHTML = this.value + "%";
        };
        econtrol_length.oninput = function() {
            validateNumberInput(this);
        };
        
        enotes.value = getNotes(cueNum);
        edesc.value = getDesc(cueNum);
        eaction.value = getAction(cueNum);
        etarget.value = getTargetId(cueNum);
        econtrol_action.value = getControlAction(cueNum);
        econtrol_target.value = getControlTargetId(cueNum);
        
        var params = getControlActionParams(cueNum);
        econtrol_length.value = params.length || 0;
        econtrol_volume.value = params.volume || 0;
        econtrol_pan.value = params.pan || 0;
        econtrol_pitch.value = params.pitch || 100;
        // TODO: position stuff
        
        econtrol_action.oninput(); // Manually trigger oninput event to display proper controls


    } else if (ctype === "image") {
        show("edit_param_table2");
        show("edit_param_table3");
        hide("edit_param_table3_audio_controls");
        show("edit_param_table3_image_controls");
        hide("edit_param_table4");
        hide("edit_param_table5");
        show("edit_param_table6");
        hide("edit_preview"); // TODO
        hide("edit_output");
        show("edit_display");
        eloops.disabled = true;

        var estartmin = document.getElementById("edit_start_pos_min");
        var estartsec = document.getElementById("edit_start_pos_sec");
        var estartms = document.getElementById("edit_start_pos_ms");
        var estopmin = document.getElementById("edit_stop_pos_min");
        var estopsec = document.getElementById("edit_stop_pos_sec");
        var estopms = document.getElementById("edit_stop_pos_ms");
        var edurationUnitTime = document.getElementById("durationUnitTime");
        var edurationUnitCue = document.getElementById("durationUnitCue");

        efile.setAttribute("accept", "image/*");

        edisplay.innerHTML = "";
        for (i = 1; i <= prodData.displayList.length; i++) {
            var option = document.createElement("option");
            option.value = i;
            option.textContent = "Display " + i;
            edisplay.add(option);
        }

        etitle.innerHTML = "Edit Cue - " + getDesc(cueNum);
        enotes.value = getNotes(cueNum);
        edesc.value = getDesc(cueNum);
        efadein.value = getFadeIn(cueNum);
        efadeout.value = getFadeOut(cueNum);
        edisplay.selectedIndex = getDisplay(cueNum) - 1;
        eaction.value = getAction(cueNum);
        etarget.value = getTargetId(cueNum);
        setEditStartPos(getStartPosAsArray(cueNum));
        setEditStopPos(getStopPosAsArray(cueNum));
        edurationUnitTime.checked = getIsTimeBased(cueNum);
        edurationUnitCue.checked = !getIsTimeBased(cueNum);

        if (hasFile(cueNum)) {
            efilename.innerHTML = getFilename(cueNum);
            efilepath.value = filer.pathToFilesystemURL(getFilename(cueNum));
            setEditFileLength(null);
            setEditStartPosMax(getStopPosAsArray(cueNum));
            setEditStopPosMax(null);
            setEditStopPosMin(getStartPosAsArray(cueNum));
        } else {
            efilename.innerHTML = "";
            efilepath.value = "";
            efile.value = "";
            setEditFileLength(null);
            // Max pos already cleared above
        }

        estartmin.oninput = function() { validateNumberInput(this); validateRange("start");};
        estartmin.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estartsec.oninput = function() { validateNumberInput(this); validateRange("start"); };
        estartsec.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estartms.oninput = function() { validateNumberInput(this); validateRange("start"); };
        estartms.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estopmin.oninput = function() { validateNumberInput(this); };
        estopmin.onblur = function() { validateNumberInput(this, true); };
        estopsec.oninput = function() { validateNumberInput(this); };
        estopsec.onblur = function() { validateNumberInput(this, true); };
        estopms.oninput = function() { validateNumberInput(this); };
        estopms.onblur = function() { validateNumberInput(this, true); };
        efile.onchange = function() {
            var filename = efile.files[0].name;
            var type = efile.files[0].type;
            var size = efile.files[0].size;
            console.log("file name: " + filename);
            console.log("file MIME: " + type);
            if (type.indexOf("image") === -1) {
                onscreenAlert(filename + " is not an image file. Please try again.");
                efile.value = "";
                return;
            }
            efilename.innerHTML = filename;
            efilepath.value = filename;
            if (!edesc.value || edesc.value === "Image Cue") {
                edesc.value = filename; // If no description is present, fill the description with the filename
            }
        };


        

        /*var eisTimeBased = document.getElementById("durationUnit");

        if (!eisTimeBased) {
            hide("edit_param_table3");
            show("edit_duration_by_cue");
        }*/


    } else if (ctype === "video") {
        show("edit_param_table2");
        show("edit_param_table3");
        show("edit_param_table3_audio_controls");
        hide("edit_param_table3_image_controls");
        hide("edit_param_table4");
        hide("edit_param_table5");
        hide("edit_param_table6");
        hide("edit_preview"); // TODO
        show("edit_output");
        show("edit_display");
        
        var estartmin = document.getElementById("edit_start_pos_min");
        var estartsec = document.getElementById("edit_start_pos_sec");
        var estartms = document.getElementById("edit_start_pos_ms");
        var estopmin = document.getElementById("edit_stop_pos_min");
        var estopsec = document.getElementById("edit_stop_pos_sec");
        var estopms = document.getElementById("edit_stop_pos_ms");

        efile.setAttribute("accept", "video/*");

        eoutput.innerHTML = "";
        for (i = 1; i <= context.destination.channelCount / 2; i++) {
            var option = document.createElement("option");
            option.value = i;
            option.textContent = "Output " + i;
            option.title = "Channels " + (i * 2 - 1) + "&" + (i * 2);
            eoutput.add(option);
        }
        edisplay.innerHTML = "";
        for (i = 1; i <= prodData.displayList.length; i++) {
            var option = document.createElement("option");
            option.value = i;
            option.textContent = "Display " + i;
            edisplay.add(option);
        }

        etitle.innerHTML = "Edit Cue - " + getDesc(cueNum);
        enotes.value = getNotes(cueNum);
        edesc.value = getDesc(cueNum);
        efadein.value = getFadeIn(cueNum);
        efadeout.value = getFadeOut(cueNum);
        eloops.value = getLoops(cueNum);
        eoutput.selectedIndex = getOutput(cueNum) - 1;
        edisplay.selectedIndex = getDisplay(cueNum) - 1;
        eaction.value = getAction(cueNum);
        etarget.value = getTargetId(cueNum);
        setEditVol(getVol(cueNum));
        setEditPan(getPan(cueNum));
        setEditPitch(getPitch(cueNum));
        setEditStartPos(getStartPosAsArray(cueNum));
        setEditStopPos(getStopPosAsArray(cueNum));

        if (hasFile(cueNum)) {
            efilename.innerHTML = getFilename(cueNum);
            efilepath.value = filer.pathToFilesystemURL(getFilename(cueNum));
            setEditFileLength(getFileDurInSecs(cueNum));
            setEditStartPosMax(getStopPosAsArray(cueNum));
            setEditStopPosMax(getFileDurAsArray(cueNum));
            setEditStopPosMin(getStartPosAsArray(cueNum));
        } else {
            efilename.innerHTML = "";
            efilepath.value = "";
            efile.value = "";
            setEditFileLength(null);
            // Max pos already cleared above
        }

        evol.oninput = function() { setEditVol(evol.value); setLiveCueVol(cueNum, evol.value); };
        evol.ondblclick = function() { setEditVol(0); setLiveCueVol(cueNum, 0); };
        epan.oninput = function() { setEditPan(epan.value); setLiveCuePan(cueNum, epan.value); };
        epan.ondblclick = function() { setEditPan(0); setLiveCuePan(cueNum, 0); };
        epitch.oninput = function() { setEditPitch(epitch.value); setLiveCuePitch(cueNum, epitch.value); };
        epitch.ondblclick = function() { setEditPitch(100); setLiveCuePitch(cueNum, 100); };
        estartmin.oninput = function() { validateNumberInput(this); validateRange("start");};
        estartmin.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estartsec.oninput = function() { validateNumberInput(this); validateRange("start"); };
        estartsec.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estartms.oninput = function() { validateNumberInput(this); validateRange("start"); };
        estartms.onblur = function() { validateNumberInput(this, true); validateRange("start"); };
        estopmin.oninput = function() { validateNumberInput(this); validateRange("stop"); };
        estopmin.onblur = function() { validateNumberInput(this, true); validateRange("stop"); };
        estopsec.oninput = function() { validateNumberInput(this); validateRange("stop"); };
        estopsec.onblur = function() { validateNumberInput(this, true); validateRange("stop"); };
        estopms.oninput = function() { validateNumberInput(this); validateRange("stop"); };
        estopms.onblur = function() { validateNumberInput(this, true); validateRange("stop"); };
        efile.onchange = function() {
            var filename = efile.files[0].name;
            var type = efile.files[0].type;
            var size = efile.files[0].size;
            console.log("file name: " + filename);
            console.log("file MIME: " + type);
            if (type.indexOf("video") === -1) {
                onscreenAlert(filename + " is not an audio file. Please try again.");
                efile.value = "";
                return;
            }
            efilename.innerHTML = filename;
            efilepath.value = filename;
            setEditButtonLock(true);
            syncDataFromMediaElement(cueNum, efile.files[0]); // Updates filelength, stop position, and start position maximum
            if (!edesc.value || edesc.value === "Video Cue") {
                edesc.value = filename; // If no description is present, fill the description with the filename
            }
        };

    }

    showEditCueMenu();

    // Focus into notes field so that user can tab through form
    enotes.focus();
    enotes.select();
}

function setEditVol(vol) {
    document.getElementById("edit_vol").innerHTML = vol + "dB";
    document.getElementById("vol_in").value = vol;
}

// v0 and v1 are in gain NOT dB
// vol is in dB NOT gain (for display only)
function logVolSlide(t0, t1, v0, v1, vol) {
    var intervalId = setInterval(function() {
        var t = this.context.currentTime;
        if (t < t1) {
            setEditVol(Math.max(gainTodB(v0 * Math.pow((v1 / v0), ((t - t0) / (t1 - t0)))).toFixed(0), -60));
        } else {
            setEditVol(vol);
            clearInterval(intervalId);
        }
    }, 100);
    
    return intervalId;
}

function setEditPan(pan) {
    document.getElementById("edit_pan").innerHTML = pan;
    document.getElementById("pan_in").value = pan;
}

function setEditPitch(pitch) {
    document.getElementById("edit_pitch").innerHTML = pitch + "%";
    document.getElementById("pitch_in").value = pitch;
}

function setLiveCueVol(cueNum, vol) {
    if (typeof activeCues !== "undefined" && activeCues[cueNum]) {
        activeCues[cueNum].gainNode.gain.value = dBToGain(vol);
    }
    
    if (typeof previewing !== "undefined" && previewing && cueNum === currentlyEditing) {
        previewing.gainNode.gain.value = dBToGain(vol);
    }
}

function setLiveCuePan(cueNum, pan) {
    if (typeof activeCues !== "undefined" && activeCues[cueNum]) {
        activeCues[cueNum].panNode.pan.value = pan / 50;
    }
    
    if (typeof previewing !== "undefined" && previewing && cueNum === currentlyEditing) {
        previewing.panNode.pan.value = pan / 50;
    }
}

function setLiveCuePitch(cueNum, percent) {
    // TODO: find a pitch changing method that includes timestretching
    // or recalculate audio file length
    /*if (typeof activeCues !== "undefined" && activeCues[cueNum]) {
        activeCues[cueNum].source.detune.value = percentageToCents(percent);
        //activeCues[cueNum].source.playbackRate.value = 100 / percent; // Inverse of detune
        // pitch change changes duration right now
    }
    
    if (typeof previewing !== "undefined" && previewing && cueNum === currentlyEditing) {
        previewing.source.detune.value = percentageToCents(percent);
        //previewing.source.playbackRate.value = 100 / percent; // Inverse of detune
        // pitch change changes duration right now
    }*/
}

function setEditFileLength(duration) {
    var efilelength = document.getElementById("edit_file_length");
    if (!duration)
        efilelength.innerHTML = "---";
    else
        efilelength.innerHTML = secToTime(duration, 3);
}

function getEditFileLength() {
    var efilelength = document.getElementById("edit_file_length");
    return timeToSec(efilelength.innerHTML);
}

function setEditStartPos(arr) {
    var emin = document.getElementById("edit_start_pos_min");
    var esec = document.getElementById("edit_start_pos_sec");
    var ems = document.getElementById("edit_start_pos_ms");
    emin.value = arr[0];
    esec.value = arr[1];
    ems.value = arr[2];
}

function getEditStartPos() {
    var emin = document.getElementById("edit_start_pos_min");
    var esec = document.getElementById("edit_start_pos_sec");
    var ems = document.getElementById("edit_start_pos_ms");
    return arrayToSec([emin.value, esec.value, ems.value]);
}

function setEditStartPosMax(arr) {
    // Remove the validateRange() call from the event handlers
    if (arr == null) {
        var emin = document.getElementById("edit_start_pos_min");
        var esec = document.getElementById("edit_start_pos_sec");
        var ems = document.getElementById("edit_start_pos_ms");
        emin.oninput = function() { validateNumberInput(this); };
        emin.onblur = function() { validateNumberInput(this, true); };
        esec.oninput = function() { validateNumberInput(this); };
        esec.onblur = function() { validateNumberInput(this, true); };
        ems.oninput = function() { validateNumberInput(this); };
        ems.onblur = function() { validateNumberInput(this, true); };
        return;
    }

    estartmaximum = arrayToSec(arr);
}

function setEditStopPos(arr) {
    var emin = document.getElementById("edit_stop_pos_min");
    var esec = document.getElementById("edit_stop_pos_sec");
    var ems = document.getElementById("edit_stop_pos_ms");
    emin.value = arr[0];
    esec.value = arr[1];
    ems.value = arr[2];
}

function getEditStopPos() {
    var emin = document.getElementById("edit_stop_pos_min");
    var esec = document.getElementById("edit_stop_pos_sec");
    var ems = document.getElementById("edit_stop_pos_ms");
    return arrayToSec([parseInt(emin.value), parseInt(esec.value), parseInt(ems.value)]);
}

function setEditStopPosMax(arr) {

    // Remove the validateRange() call from the event handlers
    if (arr == null) {
        var emin = document.getElementById("edit_stop_pos_min");
        var esec = document.getElementById("edit_stop_pos_sec");
        var ems = document.getElementById("edit_stop_pos_ms");
        emin.oninput = function() { validateNumberInput(this); };
        emin.onblur = function() { validateNumberInput(this, true); };
        esec.oninput = function() { validateNumberInput(this); };
        esec.onblur = function() { validateNumberInput(this, true); };
        ems.oninput = function() { validateNumberInput(this); };
        ems.onblur = function() { validateNumberInput(this, true); };
        return;
    }

    estopmaximum = arrayToSec(arr);
}

function getEditStopPosMax() {
    return estopmaximum;
}

function setEditStopPosMin(arr) {
    estopminimum = arrayToSec(arr);
}

function clearEditStartPos() {
    setEditStartPos([0, 0, 0]);
    setEditStartPosMax(secToArray(getEditStopPos()));
}

function clearEditStopPos() {
    var efilelength = document.getElementById("edit_file_length");
    if (efilelength.innerHTML !== "---") {
        setEditStopPos(timeToArray(efilelength.innerHTML));
        setEditStopPosMax(timeToArray(efilelength.innerHTML));
        setEditStopPosMin(secToArray(getEditStartPos()));
        setEditStartPosMax(secToArray(getEditStopPos()));
    } else {
        setEditStopPos([0, 0, 0]);
        setEditStopPosMin([0, 0, 0]);
        setEditStopPosMax([0, 0, 0]);
    }
}

function getEditTable4Dur() {
    var emin = document.getElementById("wait_min_in");
    var esec = document.getElementById("wait_sec_in");
    var ems = document.getElementById("wait_ms_in");
    return arrayToSec([emin.value, esec.value, ems.value]);
}

function setEditTable4Dur(arr) {
    var emin = document.getElementById("wait_min_in");
    var esec = document.getElementById("wait_sec_in");
    var ems = document.getElementById("wait_ms_in");
    emin.value = arr[0];
    esec.value = arr[1];
    ems.value = arr[2];
}

function clearEditTable4Dur() {
    setEditTable4Dur([0, 0, 0]);
}

function validateNumberInput(self, fillBlank) {
    self.value = self.value.replace("-", "").replace("+", "");
    if (fillBlank && self.value == "") {
        self.value = 0;
        return;
    }
}

function validateRange(type) {
    if (type === "start") {
        if (getEditStartPos() < 0) {
            setEditStartPos([0, 0, 0]);
        }
        else if (getEditStartPos() > getEditStopPos()) {
            setEditStartPos(secToArray(getEditStopPos()));
        }
    } 
    else if (type === "stop") {
        if (getEditStopPos() < getEditStartPos()) {
            setEditStopPos(secToArray(getEditStartPos()));
        }
        else if (getEditStopPos() > getEditStopPosMax()) {
            setEditStopPos(secToArray(getEditStopPosMax()));
        }
    }
    
    setEditStartPosMax(secToArray(getEditStopPos()));
    setEditStopPosMin(secToArray(getEditStartPos()));
}

function calculateEditCueDur() {
    return getEditStopPos() - getEditStartPos();
}

function saveEditedCue(cueNum) {
    cueNum = currentlyEditing;
    var ctype = getType(cueNum);

    var enotes = document.getElementById("edit_notes");
    var edesc = document.getElementById("edit_desc");
    var evol = document.getElementById("vol_in");
    var epan = document.getElementById("pan_in");
    var epitch = document.getElementById("pitch_in");
    var eaction = document.getElementById("edit_action");
    var etarget = document.getElementById("edit_target");
    var efile = document.getElementById("edit_file");
    var efilename = document.getElementById("edit_filename");
    var efilelength = document.getElementById("edit_file_length");
    var efilepath = document.getElementById("edit_filepath");
    var efadein = document.getElementById("edit_fade_in");
    var efadeout = document.getElementById("edit_fade_out");
    var eloops = document.getElementById("edit_loops");
    var eoutput = document.getElementById("edit_output");
    var edisplay = document.getElementById("edit_display");
    var estartmin = document.getElementById("edit_start_pos_min");
    var estartsec = document.getElementById("edit_start_pos_sec");
    var estartms = document.getElementById("edit_start_pos_ms");
    var estopmin = document.getElementById("edit_stop_pos_min");
    var estopsec = document.getElementById("edit_stop_pos_sec");
    var estopms = document.getElementById("edit_stop_pos_ms");
    var preview = document.getElementById("edit_preview");
    var save = document.getElementById("edit_save");
    var cancel = document.getElementById("edit_cancel");
    var revert = document.getElementById("edit_revert");


    if (ctype === "memo") {
        setDesc(cueNum, edesc.value);
        
        
    } else if (ctype === "wait") {
        setCueDur(cueNum, getEditTable4Dur());
        setNotes(cueNum, enotes.value);
        setDesc(cueNum, edesc.value);
        
        
    } else if (ctype === "audio" || ctype === "blank_audio") {
        setNotes(cueNum, enotes.value);
        setDesc(cueNum, edesc.value);
        setVol(cueNum, evol.value);
        setPan(cueNum, epan.value);
        setPitch(cueNum, epitch.value);
        if (efile.files[0]) {
            // User selected new audio file
            setType(cueNum, "audio"); // Classify blank_audio cues to audio cues when file is added
            setFilename(cueNum, efilename.innerHTML);
            writeFile(efile.files[0].name, efile.files[0]);
            setStartPos(cueNum, arrayToSec([estartmin.value, estartsec.value, estartms.value]));
            setStopPos(cueNum, arrayToSec([estopmin.value, estopsec.value, estopms.value]));
            console.log("Updated duration: " + secToTime(getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum)));
            setCueDur(cueNum, getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum)); // Duration of cue based on start and stop position
            setFileDur(cueNum, getEditFileLength()); // Full duration of file
        } else if (efilename.innerHTML === "") {
            // User removed file
            setType(cueNum, "blank_audio");
            setCueDur(cueNum, null);
            setFileDur(cueNum, null);
            setStartPos(cueNum, 0);
            setStopPos(cueNum, 0);
            setFilename(cueNum, "");
        } else {
            // User did not change file but may have changed times
            setStartPos(cueNum, arrayToSec([estartmin.value, estartsec.value, estartms.value]));
            setStopPos(cueNum, arrayToSec([estopmin.value, estopsec.value, estopms.value]));
            console.log("Updated duration: " + secToTime(getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum)));
            setCueDur(cueNum, getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum)); // Duration of cue based on start and stop position
            setFileDur(cueNum, getEditFileLength()); // Full duration of file
        }
        setFadeIn(cueNum, efadein.value);
        setFadeOut(cueNum, efadeout.value);
        setLoops(cueNum, (eloops.value < -1) ? -1 : eloops.value); // Limit loops to [-1, inf)
        setOutput(cueNum, eoutput.selectedIndex + 1);
        setAction(cueNum, eaction.value);
        setTarget(cueNum, etarget.value);
        
    
    } else if (ctype === "control") {
        var econtrol_action = document.getElementById("edit_control_action");
        var econtrol_target = document.getElementById("edit_control_target");
        var econtrol_length = document.getElementById("edit_control_length");
        var econtrol_volume = document.getElementById("edit_control_volume");
        var econtrol_pan = document.getElementById("edit_control_pan");
        var econtrol_pitch = document.getElementById("edit_control_pitch");
        var econtrol_pos_m = document.getElementById("edit_pos_m");
        var econtrol_pos_s = document.getElementById("edit_pos_s");
        var econtrol_pos_ms = document.getElementById("edit_pos_ms");
        var hasLength = [2, 5, 6, 7, 10, 11]; // Options in control action menu that require saving a cue duration
        
        setNotes(cueNum, enotes.value);
        setDesc(cueNum, edesc.value);
        if (hasLength.includes(econtrol_action.selectedIndex)) {
            setCueDur(cueNum, econtrol_length.value);
            setFileDur(cueNum, econtrol_length.value);
        } else {
            setCueDur(cueNum, null);
            setFileDur(cueNum, null);
        }
        setAction(cueNum, eaction.value);
        setTarget(cueNum, etarget.value);
        setControlAction(cueNum, econtrol_action.value);
        setControlTargetId(cueNum, econtrol_target.value);
        
        var params = {};
        params.length = econtrol_length.value;
        params.volume = econtrol_volume.value;
        params.pan = econtrol_pan.value;
        params.pitch = econtrol_pitch.value;
        setControlActionParams(cueNum, params);
        
        // TODO: position stuff


    } else if (ctype === "image") {
        var edurationUnitTime = document.getElementById("durationUnitTime");

        setNotes(cueNum, enotes.value);
        setDesc(cueNum, edesc.value);
        if (efile.files[0]) {
            // User selected new image file
            setFilename(cueNum, efilename.innerHTML);
            writeFile(efile.files[0].name, efile.files[0]);
        } else if (efilename.innerHTML === "") {
            // User removed file
            setFilename(cueNum, "");
        }
        setStartPos(cueNum, arrayToSec([estartmin.value, estartsec.value, estartms.value]));
        setStopPos(cueNum, arrayToSec([estopmin.value, estopsec.value, estopms.value]));
        setCueDur(cueNum, getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum));
        setFadeIn(cueNum, efadein.value);
        setFadeOut(cueNum, efadeout.value);
        setIsTimeBased(cueNum, edurationUnitTime.checked);
        setDisplay(cueNum, edisplay.selectedIndex + 1);
        setAction(cueNum, eaction.value);
        setTarget(cueNum, etarget.value);


    } else if (ctype === "video") {
        setNotes(cueNum, enotes.value);
        setDesc(cueNum, edesc.value);
        setVol(cueNum, evol.value);
        setPan(cueNum, epan.value);
        setPitch(cueNum, epitch.value);
        if (efile.files[0]) {
            // User selected new audio file
            setFilename(cueNum, efilename.innerHTML);
            writeFile(efile.files[0].name, efile.files[0]);
            setStartPos(cueNum, arrayToSec([estartmin.value, estartsec.value, estartms.value]));
            setStopPos(cueNum, arrayToSec([estopmin.value, estopsec.value, estopms.value]));
            console.log("Updated duration: " + secToTime(getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum)));
            setCueDur(cueNum, getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum)); // Duration of cue based on start and stop position
            setFileDur(cueNum, getEditFileLength()); // Full duration of file
        } else if (efilename.innerHTML === "") {
            // User removed file
            setCueDur(cueNum, null);
            setFileDur(cueNum, null);
            setStartPos(cueNum, 0);
            setStopPos(cueNum, 0);
            setFilename(cueNum, "");
        } else {
            // User did not change file but may have changed times
            setStartPos(cueNum, arrayToSec([estartmin.value, estartsec.value, estartms.value]));
            setStopPos(cueNum, arrayToSec([estopmin.value, estopsec.value, estopms.value]));
            console.log("Updated duration: " + secToTime(getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum)));
            setCueDur(cueNum, getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum)); // Duration of cue based on start and stop position
            setFileDur(cueNum, getEditFileLength()); // Full duration of file
        }
        setFadeIn(cueNum, efadein.value);
        setFadeOut(cueNum, efadeout.value);
        setLoops(cueNum, eloops.value);
        setOutput(cueNum, eoutput.selectedIndex + 1);
        setDisplay(cueNum, edisplay.selectedIndex + 1);
        setAction(cueNum, eaction.value);
        setTarget(cueNum, etarget.value);


    }
    
    // Release event handlers
    evol.oninput = function() {};
    evol.ondblclick = function() {};
    epan.oninput = function() {};
    epan.ondblclick = function() {};
    epitch.oninput = function() {};
    epitch.ondblclick = function() {};
    efile.onchange = function() {};

    hideEditCueMenu();
    currentlyEditing = 0;
    setSavedIndicator(false);
    updateUndoRedoStack();
}

function cancelEditedCue(cueNum) {
    cueNum = cueNum || currentCue;
    var ctype = getType(cueNum);
    
    if (ctype === "audio" || ctype === "blank_audio") {
        // Reset live controls to previous values
        setLiveCueVol(cueNum, getVol(cueNum));
        setLiveCuePan(cueNum, getPan(cueNum));
        setLiveCuePitch(cueNum, getPitch(cueNum));
    }
    
    hideEditCueMenu();
}

function showNewCueMenu() {
    hideEditCueMenu();
    document.getElementById("cue_type").selectedIndex = 0;
    show("new_cue_menu");
    keyListeners(false, false, true, false);
}

function hideNewCueMenu() {
    hide("new_cue_menu");
    keyListeners(false, false, false, false);
}

function showEditCueMenu() {
    hideNewCueMenu();
    show("edit_cue_menu");
    keyListeners(false, false, false, true);
}

function hideEditCueMenu() {
    if (previewing) {
        previewing.stop();
    }
    hide("edit_cue_menu");
    keyListeners(false, false, false, false);
}

function select(cueNum) {
    var cues = document.getElementsByClassName("selected");

    // Check if there is a selected cue and if we're already on the desired one
    if (cues[0] && cues[0].id == cueNum) {
        return;
    } else if (cues[0]) {
        cues[0].className = cues[0].className.replace("selected", "deselected");
        closeAll();
    }

    var selCue = document.getElementById(cueNum);
    selCue.className = selCue.className.replace("deselected", "selected");
    currentCue = cueNum; // Global tracker
    checkButtonLock();
}

function checkButtonLock() {
    setButtonLock(typeof activeCues !== "undefined" && activeCues[currentCue])
}

function setButtonLock(val) {
    var go = document.getElementById("go_button");
    var editfile = document.getElementById("edit_file");
    var editremove = document.getElementById("edit_remove");
    var editfieldset = document.getElementById("edit_fade_pos_loop_fieldset");
    var editoutput = document.getElementById("edit_output");
    var editdisplay = document.getElementById("edit_display");
    
    go.disabled = val;
    editfile.disabled = val;
    editremove.disabled = val;
    editfieldset.disabled = val;
    editoutput.disabled = val;
    editdisplay.disabled = val;
}

function setEditButtonLock(val) {
    var preview = document.getElementById("edit_preview");
    var save = document.getElementById("edit_save");
    var cancel = document.getElementById("edit_cancel");
    var revert = document.getElementById("edit_revert");
    
    preview.disabled = val;
    save.disabled = val;
    cancel.disabled = val;
    revert.disabled = val;
    
}

function updateProgressBar(cueNum, percent, remaining) {
    var bar = document.getElementById(cueNum + "0005");
    if (remaining <= userConfig.PROGRESS_BAR_WARNING_TIME) {
        bar.style.backgroundImage = "url(images/red-dot.jpg)";
        bar.style.backgroundSize = percent + "% 100%";
    } else {
        bar.style.backgroundSize = percent + "% 100%, " + percent + "% 100%";
    }
}

function resetProgressBar(cueNum) {
    var bar = document.getElementById(cueNum + "0005");
    bar.style.backgroundSize = 0, 0;
    bar.style.backgroundImage = ""; // Reverts to CSS defaults
}

function secToTime(sec, decimals) {
    decimals = decimals || 1;
    if (sec === "")
        sec = 0;
    sec = parseFloat(sec);
    var ms = (sec - parseInt(sec)).toFixed(decimals);
    var min = parseInt(sec / 60);
    var sec = (sec % 60).toFixed(2);
    return min + ":" + pad(sec) + String(ms).substring(1);
}

function timeToSec(time) {
    if (time === "")
        return 0;
    var min = parseInt(time.substring(0, time.indexOf(":")));
    var sec = parseFloat(time.substring(time.indexOf(":") + 1));
    return (60 * min + sec).toFixed(3);
}

function secToArray(sec) {
    var arr = [0, 0, 0];
    if (sec === 0 || sec === "")
        return arr;
    sec = parseFloat(sec);
    arr[0] = parseInt(sec / 60);
    arr[1] = parseInt(sec % 60);
    arr[2] = (sec - parseInt(sec)).toFixed(3) * 1000;
    return arr;   
}

function timeToArray(time) {
    return secToArray(timeToSec(time));
}

function arrayToSec(arr) {
    return parseInt(arr[0]) * 60 + parseInt(arr[1]) + parseInt(arr[2]) / 1000;
}

function arrayToTime(arr) {
    return secToTime(arrayToSec(arr), 3);
}

function pad(n) {
    n = parseInt(n);
    if (n >=0 && n < 10) 
        return "0" + n; 
    if(n > -10 && n < 0) 
        return "-0" + Math.abs(n); 
    return n; 
}

function getType(cueNum) {
    return document.getElementById(cueNum + "00010001").innerHTML;
}

function setType(cueNum, type) {
    document.getElementById(cueNum + "00010001").innerHTML = type;
}

function getEnabled(cueNum) {
    return document.getElementById(cueNum + "00010002").checked;
}

function setEnabled(cueNum, state) {
    document.getElementById(cueNum + "00010002").checked = state;
}

function getCheckStatus(cueNum) {
    return document.getElementById(cueNum + "00010003").innerHTML;
}

function setCheckStatus(cueNum, val) {
    document.getElementById(cueNum + "00010003").innerHTML = val;
}

function getFilename(cueNum) {
    return document.getElementById(cueNum + "00010004").innerHTML;
}

function setFilename(cueNum, name) {
    document.getElementById(cueNum + "00010004").innerHTML = name;
}

function getNotes(cueNum) {
    return document.getElementById(cueNum + "00040002").innerHTML;
}

function setNotes(cueNum, notes) {
    document.getElementById(cueNum + "00040001").value = notes;
    document.getElementById(cueNum + "00040002").innerHTML = notes;
}

function getDesc(cueNum) {
    return document.getElementById(cueNum + "00050002").innerHTML;
}

function setDesc(cueNum, desc) {
    document.getElementById(cueNum + "00050001").value = desc;
    document.getElementById(cueNum + "00050002").innerHTML = desc;
}

function setCueDur(cueNum, sec) {
    var dur = document.getElementById(cueNum + "00060001");
    if (sec == null)
        dur.innerHTML = "";
    else
        dur.innerHTML = secToTime(sec);
}

function getCueDur(cueNum) {
    return document.getElementById(cueNum + "00060001").innerHTML;
}

function getCueDurInSecs(cueNum) {
    return parseFloat(timeToSec(getCueDur(cueNum)));
}

function getCueDurAsArray(cueNum) {
    return timeToArray(getCueDur(cueNum));
}

function calculateCueDurInSecs(cueNum) {
    return getStopPosInSecs(cueNum) - getStartPosInSecs(cueNum);
}

function setFileDur(cueNum, sec) {
    var dur = document.getElementById(cueNum + "00060006");
    if (!sec)
        dur.innerHTML = "";
    else
        dur.innerHTML = secToTime(sec, 3);
}

function getFileDur(cueNum) {
    return document.getElementById(cueNum + "00060006").innerHTML;
}

function getFileDurInSecs(cueNum) {
    return parseFloat(timeToSec(getFileDur(cueNum)));
}

function getFileDurAsArray(cueNum) {
    return timeToArray(getFileDur(cueNum));
}

function getIsTimeBased(cueNum) {
    return parseInt(document.getElementById(cueNum + "00060006").innerHTML);
}

function setIsTimeBased(cueNum, bool) {
    if (bool) {
        document.getElementById(cueNum + "00060006").innerHTML = "1";
    } else {
        document.getElementById(cueNum + "00060006").innerHTML = "0";
    }
}

function getStartPos(cueNum) {
    return secToTime(getStartPosInSecs(cueNum));
}

function getStartPosInSecs(cueNum) {
    return parseFloat(document.getElementById(cueNum + "00060002").innerHTML);
}

function getStartPosAsArray(cueNum) {
    return secToArray(getStartPosInSecs(cueNum));
}

function setStartPos(cueNum, pos) {
    document.getElementById(cueNum + "00060002").innerHTML = pos;
}

function getStopPos(cueNum) {
    return secToTime(getStopPosInSecs(cueNum));
}

function getStopPosInSecs(cueNum) {
    return parseFloat(document.getElementById(cueNum + "00060003").innerHTML);
}

function getStopPosAsArray(cueNum) {
    return secToArray(getStopPosInSecs(cueNum));
}

function setStopPos(cueNum, pos) {
    document.getElementById(cueNum + "00060003").innerHTML = pos;
}

function getFadeIn(cueNum) {
    return parseFloat(document.getElementById(cueNum + "00060004").innerHTML);
}

function setFadeIn(cueNum, length) {
    document.getElementById(cueNum + "00060004").innerHTML = length;
}

function getFadeOut(cueNum) {
    return parseFloat(document.getElementById(cueNum + "00060005").innerHTML);
}

function setFadeOut(cueNum, length) {
    document.getElementById(cueNum + "00060005").innerHTML = length;
}

function getElapsed(cueNum) {
    return parseFloat(timeToSec(document.getElementById(cueNum + "00070001").innerHTML));
}

function setElapsed(cueNum, sec) {
    var elapsed = document.getElementById(cueNum + "00070001");
    if (!sec && sec !== 0)
        elapsed.innerHTML = "";
    else
        elapsed.innerHTML = secToTime(sec);
}

function setRemaining(cueNum, sec) {
    var remaining = document.getElementById(cueNum + "00080001");
    if (!sec && sec !== 0)
        remaining.innerHTML = "";
    else
        remaining.innerHTML = secToTime(sec);
}

function getVol(cueNum) {
    return parseInt(document.getElementById(cueNum + "00090001").innerHTML);
}

function setVol(cueNum, vol) {
    document.getElementById(cueNum + "00090001").innerHTML = vol + "dB";
}

function getPan(cueNum) {
    return parseInt(document.getElementById(cueNum + "000100001").innerHTML);
}

function setPan(cueNum, pan) {
    document.getElementById(cueNum + "000100001").innerHTML = pan;
}

function getPitch(cueNum) {
    return parseInt(document.getElementById(cueNum + "000110001").innerHTML);
}

function setPitch(cueNum, pitch) {
    document.getElementById(cueNum + "000110001").innerHTML = pitch + "%";
}

function getLoops(cueNum) {
    return parseInt(document.getElementById(cueNum + "000120001").innerHTML);
}

function setLoops(cueNum, loops) {
    document.getElementById(cueNum + "000120001").innerHTML = loops;
}

function getOutput(cueNum) {
    var str = document.getElementById(cueNum + "000130001").innerHTML;
    str = str.replace("Output ", "");
    str = str.replace("Display ", "");
    return parseInt(str);
}

function setOutput(cueNum, outputId) {
    document.getElementById(cueNum + "000130001").innerHTML = "Output " + outputId;
}

function getDisplay(cueNum) {
    var str = document.getElementById(cueNum + "000130002").innerHTML;
    str = str.replace("Display ", "");
    return parseInt(str);
}

function setDisplay(cueNum, displayId) {
    document.getElementById(cueNum + "000130002").innerHTML = "Display " + displayId;
}

function getAction(cueNum) {
    return document.getElementById(cueNum + "000140001").innerHTML;
}

function getControlAction(cueNum) {
    return document.getElementById(cueNum + "000140002").innerHTML;
}

function getControlActionParams(cueNum) {
    return JSON.parse(document.getElementById(cueNum + "000140003").innerHTML);
}

function setAction(cueNum, action) {
    document.getElementById(cueNum + "000140001").innerHTML = action;
}

function setControlAction(cueNum, action) {
    document.getElementById(cueNum + "000140002").innerHTML = action;
}

function setControlActionParams(cueNum, params) {
    document.getElementById(cueNum + "000140003").innerHTML = JSON.stringify(params);
}

function getTarget(cueNum) {
    return document.getElementById(cueNum + "000150001").innerHTML;
}

function setTarget(cueNum, targetId) {
    targetId = parseInt(targetId);
    if (targetId === 0) {
        document.getElementById(cueNum + "000150001").innerHTML = "Next Cue";
        document.getElementById(cueNum + "000150002").innerHTML = 0;
    } else {
        document.getElementById(cueNum + "000150001").innerHTML = targetId + " - " + getDesc(targetId);
        document.getElementById(cueNum + "000150002").innerHTML = targetId;
    }
}

function getTargetId(cueNum) {
    return parseInt(document.getElementById(cueNum + "000150002").innerHTML);
}

function getControlTargetId(cueNum) {
    return parseInt(document.getElementById(cueNum + "000150003").innerHTML);
}

function setControlTargetId(cueNum, targetId) {
    document.getElementById(cueNum + "000150003").innerHTML = targetId;
}

function hasFile(cueNum) {
    return getFilename(cueNum) !== "";
}

function isDependentFile(filename) {
    var count = 0;
    for (var i = 1; i <= cueListLength; i++) {
        if (getType(i) === "audio" && getFilename(i) === filename) {
            count++; // Account for self having filename
            if (count > 1)
                return true;
        }
    }
    return false;
}

function deleteEditMediaFile(cueNum) {
    cueNum = cueNum || currentCue;
    // Actual deletion must take place in saveEditedCue in case user selects cancel
    var efile = document.getElementById("edit_file");
    var efilename = document.getElementById("edit_filename");
    var efilepath = document.getElementById("edit_filepath");
    efile.value = "";
    efilename.innerHTML = "";
    efilepath.value = "";
    setEditFileLength(null);
    clearEditStartPos();
    clearEditStopPos();
    setEditStartPosMax(null);
    setEditStopPosMax(null);
    setEditStopPosMin([0, 0, 0]);
}

function initializeCue(cueNum) {
    var ctype = getType(cueNum);
    
    if (ctype === "memo") {
        setEnabled(cueNum, false);
        setDesc(cueNum, "");
        
    } else if (ctype === "wait") {
        setEnabled(cueNum, true);
        setNotes(cueNum, "");
        setDesc(cueNum, "Wait Cue");
        setCueDur(cueNum, 0);
        setFileDur(cueNum, 0);
        setAction(cueNum, "EP");
        setTarget(cueNum, 0);
    
    } else if (ctype === "audio" || ctype === "blank_audio") {
        setEnabled(cueNum, true);
        setNotes(cueNum, "");
        setDesc(cueNum, "Audio Cue");
        setFilename(cueNum, "");
        setCueDur(cueNum, null);
        setFileDur(cueNum, null);
        setStartPos(cueNum, 0);
        setStopPos(cueNum, 0);
        setFadeIn(cueNum, 0);
        setFadeOut(cueNum, 0);
        setVol(cueNum, 0);
        setPan(cueNum, 0);
        setPitch(cueNum, 100);
        setLoops(cueNum, 1);
        setOutput(cueNum, 1);
        setAction(cueNum, "SA");
        setTarget(cueNum, 0);
        
    } else if  (ctype === "control") {
        setEnabled(cueNum, true);
        setNotes(cueNum, "");
        setDesc(cueNum, "Control Cue");
        setCueDur(cueNum, null);
        setFileDur(cueNum, null);
        setAction(cueNum, "SA");
        setTarget(cueNum, 0);
        setControlAction(cueNum, "");
        setControlTargetId(cueNum, 0);
        setControlActionParams(cueNum, {});
        
    } else if (ctype === "image") {
        setEnabled(cueNum, true);
        setNotes(cueNum, "");
        setDesc(cueNum, "Image Cue");
        setCueDur(cueNum, null);
        setStartPos(cueNum, 0);
        setStopPos(cueNum, 0);
        setFadeIn(cueNum, 0);
        setFadeOut(cueNum, 0);
        setIsTimeBased(cueNum, true);
        setDisplay(cueNum, 1);
        setAction(cueNum, "SA");
        setTarget(cueNum, 0);

    } else if (ctype === "video") {
        setEnabled(cueNum, true);
        setNotes(cueNum, "");
        setDesc(cueNum, "Video Cue");
        setFilename(cueNum, "");
        setCueDur(cueNum, null);
        setFileDur(cueNum, null);
        setStartPos(cueNum, 0);
        setStopPos(cueNum, 0);
        setFadeIn(cueNum, 0);
        setFadeOut(cueNum, 0);
        setVol(cueNum, 0);
        setPan(cueNum, 0);
        setPitch(cueNum, 100);
        setLoops(cueNum, 1);
        setOutput(cueNum, 1);
        setDisplay(cueNum, 1);
        setAction(cueNum, "SA");
        setTarget(cueNum, 0);

    }

}

function getAllHTML() {
    var html = "<!DOCTYPE html><html>" + document.getElementsByTagName("html")[0].innerHTML + "</html>";
    console.log(html);
    return html;
}

function getCueListHTML() {
    var html = document.getElementById("cue_list").innerHTML;
    return html;
}

function createCue(cueType) {
    // Just for safety
    if (cueListLength * 100010000 >= Number.MAX_SAFE_INTEGER) {
        onscreenAlert("Cannot add cue. Cue list has reached max length.");
        return 0;
    }

    var cueList = document.getElementById("cue_list");
    cueType = cueType || document.getElementById("cue_type").value;

    var cue = cueList.insertRow(cueListLength + 1); // Create cue in last spot
    var cueId = String(cueListLength + 1);
    cue.id = cueId;
    cue.className = "cue-row deselected";
    cue.setAttribute('onclick', 'select(' + cue.id + ')');
    cue.setAttribute('ondblclick', 'editCue(' + cue.id + ')');
    cueId += "000"; // Seperator for preventing duplicate ids

    if (cueType === "audio" || cueType === "blank_audio") {
        for (var i = 1; i <= 15; i++) {
            var cell = cue.insertCell(i - 1);
            cell.id = cueId + i;
            var cellId = cell.id + "000";
            switch (i) {
                case 1:
                    cell.className = "cue audio en";

                    var ctype = document.createElement("div");
                    ctype.className = "hidden";
                    ctype.id = cellId + "1";
                    ctype.innerHTML = cueType;
                    cell.appendChild(ctype);

                    var input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = cellId + "2";
                    input.name = "en";
                    input.checked = true;
                    input.setAttribute('onchange', 'updateCheckStatus(' + cue.id + ', this.checked)');
                    cell.appendChild(input);
                    
                    var checkStatus = document.createElement("div");
                    checkStatus.className = "hidden";
                    checkStatus.id = cellId + "3";
                    checkStatus.innerHTML = "checked";
                    cell.appendChild(checkStatus);
                    
                    var filename = document.createElement("div");
                    filename.className = "hidden";
                    filename.id = cellId + "4";
                    cell.appendChild(filename);
                    break;
                case 2:
                    cell.className = "cue audio q";
                    cell.innerHTML = cue.id;
                    break;
                case 3:
                    cell.className = "cue audio hkey";
                    break;
                case 4:
                    cell.className = "cue audio notes";

                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "hidden long";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    cell.className = "cue audio desc progress";
                    
                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "long hidden";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    cell.className = "cue audio dur";

                    var displaydur = document.createElement("div");
                    displaydur.id = cellId + "1";
                    displaydur.className = "visible";
                    cell.appendChild(displaydur);
                    
                    var startPos = document.createElement("div");
                    startPos.id = cellId + "2";
                    startPos.className = "hidden";
                    cell.appendChild(startPos);
                    
                    var stopPos = document.createElement("div");
                    stopPos.id = cellId + "3";
                    stopPos.className = "hidden";
                    cell.appendChild(stopPos);
                    
                    var fadeIn = document.createElement("div");
                    fadeIn.id = cellId + "4";
                    fadeIn.className = "hidden";
                    cell.appendChild(fadeIn);
                    
                    var fadeOut = document.createElement("div");
                    fadeOut.id = cellId + "5";
                    fadeOut.className = "hidden";
                    cell.appendChild(fadeOut);
                    
                    var fullfileduration = document.createElement("div");
                    fullfileduration.id = cellId + "6";
                    fullfileduration.className = "hidden";
                    cell.appendChild(fullfileduration);
                    break;
                case 7:
                    cell.className = "cue audio elapsed";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 8:
                    cell.className = "cue audio remaining";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 9:
                    cell.className = "cue audio vol";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 10:
                    cell.className = "cue audio pan";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 11:
                    cell.className = "cue audio pitch";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 12:
                    cell.className = "cue audio loops";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 13:
                    cell.className = "cue audio output";
                    
                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.classname = "visible";
                    cell.appendChild(display);
                    break;
                case 14:
                    cell.className = "cue audio action";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 15:
                    cell.className = "cue audio target";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);

                    var targetId = document.createElement("div");
                    targetId.id = cellId + "2";
                    targetId.className = "hidden";
                    cell.appendChild(targetId);
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "wait") {
        for (var i = 1; i <= 15; i++) {
            var cell = cue.insertCell(i - 1);
            cell.id = cueId + i;
            var cellId = cell.id + "000";
            switch (i) {
                case 1:
                    cell.className = "cue wait en";

                    var ctype = document.createElement("div");
                    ctype.className = "hidden";
                    ctype.id = cellId + "1";
                    ctype.innerHTML = cueType;
                    cell.appendChild(ctype);

                    var input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = cellId + "2";
                    input.name = "en";
                    input.checked = true;
                    input.setAttribute('onchange', 'updateCheckStatus(' + cue.id + ', this.checked)');
                    cell.appendChild(input);
                    
                    var checkStatus = document.createElement("div");
                    checkStatus.className = "hidden";
                    checkStatus.id = cellId + "3";
                    checkStatus.innerHTML = "checked";
                    cell.appendChild(checkStatus);
                    
                    var filename = document.createElement("div");
                    filename.className = "hidden";
                    filename.id = cellId + "4";
                    cell.appendChild(filename);
                    break;
                case 2:
                    cell.className = "cue wait q";
                    cell.innerHTML = cue.id;
                    break;
                case 3:
                    cell.className = "cue wait hkey";
                    break;
                case 4:
                    cell.className = "cue wait notes";

                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "hidden long";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);
                    break;
                case 5:
                    cell.className = "cue wait desc progress";
                    
                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "long hidden";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    cell.className = "cue wait dur";

                    var displaydur = document.createElement("div");
                    displaydur.id = cellId + "1";
                    displaydur.className = "visible";
                    cell.appendChild(displaydur);
                    
                    var startPos = document.createElement("div");
                    startPos.id = cellId + "2";
                    startPos.className = "hidden";
                    cell.appendChild(startPos);
                    
                    var stopPos = document.createElement("div");
                    stopPos.id = cellId + "3";
                    stopPos.className = "hidden";
                    cell.appendChild(stopPos);
                    
                    var fadeIn = document.createElement("div");
                    fadeIn.id = cellId + "4";
                    fadeIn.className = "hidden";
                    cell.appendChild(fadeIn);
                    
                    var fadeOut = document.createElement("div");
                    fadeOut.id = cellId + "5";
                    fadeOut.className = "hidden";
                    cell.appendChild(fadeOut);
                    
                    var fullfileduration = document.createElement("div");
                    fullfileduration.id = cellId + "6";
                    fullfileduration.className = "hidden";
                    cell.appendChild(fullfileduration);
                    break;
                case 7:
                    cell.className = "cue wait elapsed";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 8:
                    cell.className = "cue wait remaining";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 9:
                    cell.className = "cue wait vol";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 10:
                    cell.className = "cue wait pan";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 11:
                    cell.className = "cue wait pitch";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 12:
                    cell.className = "cue wait loops";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 13:
                    cell.className = "cue wait output";
                    
                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.classname = "visible";
                    cell.appendChild(display);
                    break;
                case 14:
                    cell.className = "cue wait action";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 15:
                    cell.className = "cue wait target";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);

                    var targetId = document.createElement("div");
                    targetId.id = cellId + "2";
                    targetId.className = "hidden";
                    cell.appendChild(targetId);
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "memo") {
        for (var i = 1; i <= 3; i++) {
            var cell = cue.insertCell(i - 1);
            if (i === 3)
                i = 5; // Maintain id for description cell; even though it sits in cell 3 for memos it should be id 5
            cell.id = cueId + i;
            var cellId = cell.id + "000";
            switch (i) {
                case 1:
                    cell.className = "cue memo en";

                    var ctype = document.createElement("div");
                    ctype.className = "hidden";
                    ctype.id = cellId + "1";
                    ctype.innerHTML = cueType;
                    cell.appendChild(ctype);

                    var input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = cellId + "2";
                    input.name = "en";
                    input.checked = false;
                    input.setAttribute('onchange', 'updateCheckStatus(' + cue.id + ', this.checked)');
                    cell.appendChild(input);
                    
                    var checkStatus = document.createElement("div");
                    checkStatus.className = "hidden";
                    checkStatus.id = cellId + "3";
                    checkStatus.innerHTML = "unchecked";
                    cell.appendChild(checkStatus);
                    
                    var filename = document.createElement("div");
                    filename.className = "hidden";
                    filename.id = cellId + "4";
                    cell.appendChild(filename);
                    break;
                case 2:
                    cell.className = "cue memo q";
                    cell.innerHTML = cue.id;
                    break;
                case 5:
                    cell.className = "cue memo desc";
                    cell.colSpan = 13;

                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "long hidden";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "control") {
        for (var i = 1; i <= 15; i++) {
            var cell = cue.insertCell(i - 1);
            cell.id = cueId + i;
            var cellId = cell.id + "000";
            switch (i) {
                case 1:
                    cell.className = "cue control en";

                    var ctype = document.createElement("div");
                    ctype.className = "hidden";
                    ctype.id = cellId + "1";
                    ctype.innerHTML = cueType;
                    cell.appendChild(ctype);

                    var input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = cellId + "2";
                    input.name = "en";
                    input.checked = true;
                    input.setAttribute('onchange', 'updateCheckStatus(' + cue.id + ', this.checked)');
                    cell.appendChild(input);
                    
                    var checkStatus = document.createElement("div");
                    checkStatus.className = "hidden";
                    checkStatus.id = cellId + "3";
                    checkStatus.innerHTML = "checked";
                    cell.appendChild(checkStatus);
                    break;
                case 2:
                    cell.className = "cue control q";
                    cell.innerHTML = cue.id;
                    break;
                case 3:
                    cell.className = "cue control hkey";
                    break;
                case 4:
                    cell.className = "cue control notes";

                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "hidden long";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    cell.className = "cue control desc progress";
                    
                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "long hidden";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    cell.className = "cue control dur";

                    var displaydur = document.createElement("div");
                    displaydur.id = cellId + "1";
                    displaydur.className = "visible";
                    cell.appendChild(displaydur);
                    
                    var fadeIn = document.createElement("div");
                    fadeIn.id = cellId + "4";
                    fadeIn.className = "hidden";
                    cell.appendChild(fadeIn);
                    
                    var fadeOut = document.createElement("div");
                    fadeOut.id = cellId + "5";
                    fadeOut.className = "hidden";
                    cell.appendChild(fadeOut);
                    
                    var isTimeBased = document.createElement("div");
                    isTimeBased.id = cellId + "6";
                    isTimeBased.className = "hidden";
                    cell.appendChild(isTimeBased);
                    break;
                case 7:
                    cell.className = "cue control elapsed";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 8:
                    cell.className = "cue control remaining";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 9:
                    cell.className = "cue control vol";
                    break;
                case 10:
                    cell.className = "cue control pan";
                    break;
                case 11:
                    cell.className = "cue control pitch";
                    break;
                case 12:
                    cell.className = "cue control loops";
                    break;
                case 13:
                    cell.className = "cue control output";
                    
                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.classname = "visible";
                    cell.appendChild(display);
                    break;
                case 14:
                    cell.className = "cue control action";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    
                    var ctrlAction = document.createElement("div");
                    ctrlAction.id = cellId + "2";
                    ctrlAction.className = "hidden";
                    cell.appendChild(ctrlAction);
                    
                    var param = document.createElement("div");
                    param.id = cellId + "3";
                    param.className = "hidden";
                    cell.appendChild(param);
                    break;
                case 15:
                    cell.className = "cue control target";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);

                    var targetId = document.createElement("div");
                    targetId.id = cellId + "2";
                    targetId.className = "hidden";
                    cell.appendChild(targetId);
                    
                    var ctrlTargetId = document.createElement("div");
                    ctrlTargetId.id = cellId + "3";
                    ctrlTargetId.className = "hidden";
                    cell.appendChild(ctrlTargetId);
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "image") {
        for (var i = 1; i <= 15; i++) {
            var cell = cue.insertCell(i - 1);
            cell.id = cueId + i;
            var cellId = cell.id + "000";
            switch (i) {
                case 1:
                    cell.className = "cue image en";

                    var ctype = document.createElement("div");
                    ctype.className = "hidden";
                    ctype.id = cellId + "1";
                    ctype.innerHTML = cueType;
                    cell.appendChild(ctype);

                    var input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = cellId + "2";
                    input.name = "en";
                    input.checked = true;
                    input.setAttribute('onchange', 'updateCheckStatus(' + cue.id + ', this.checked)');
                    cell.appendChild(input);
                    
                    var checkStatus = document.createElement("div");
                    checkStatus.className = "hidden";
                    checkStatus.id = cellId + "3";
                    checkStatus.innerHTML = "checked";
                    cell.appendChild(checkStatus);
                    
                    var filename = document.createElement("div");
                    filename.className = "hidden";
                    filename.id = cellId + "4";
                    cell.appendChild(filename);
                    break;
                case 2:
                    cell.className = "cue image q";
                    cell.innerHTML = cue.id;
                    break;
                case 3:
                    cell.className = "cue image hkey";
                    break;
                case 4:
                    cell.className = "cue image notes";

                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "hidden long";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    cell.className = "cue image desc progress";
                    
                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "long hidden";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    cell.className = "cue image dur";

                    var displaydur = document.createElement("div");
                    displaydur.id = cellId + "1";
                    displaydur.className = "visible";
                    cell.appendChild(displaydur);

                    var startPos = document.createElement("div");
                    startPos.id = cellId + "2";
                    startPos.className = "hidden";
                    cell.appendChild(startPos);
                    
                    var stopPos = document.createElement("div");
                    stopPos.id = cellId + "3";
                    stopPos.className = "hidden";
                    cell.appendChild(stopPos);
                    
                    var fadeIn = document.createElement("div");
                    fadeIn.id = cellId + "4";
                    fadeIn.className = "hidden";
                    cell.appendChild(fadeIn);
                    
                    var fadeOut = document.createElement("div");
                    fadeOut.id = cellId + "5";
                    fadeOut.className = "hidden";
                    cell.appendChild(fadeOut);

                    var isTimeBased = document.createElement("div");
                    isTimeBased.id = cellId + "6";
                    isTimeBased.className = "hidden";
                    cell.appendChild(isTimeBased);
                    
                    break;
                case 7:
                    cell.className = "cue image elapsed";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 8:
                    cell.className = "cue image remaining";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 9:
                    cell.className = "cue image vol";
                    break;
                case 10:
                    cell.className = "cue image pan";
                    break;
                case 11:
                    cell.className = "cue image pitch";
                    break;
                case 12:
                    cell.className = "cue image loops";
                    break;
                case 13:
                    cell.className = "cue image output";
                    
                    var output = document.createElement("div");
                    output.id = cellId + "1";
                    output.classname = "visible";
                    cell.appendChild(output);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.classname = "visible";
                    cell.appendChild(display);
                    break;
                case 14:
                    cell.className = "cue image action";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 15:
                    cell.className = "cue image target";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);

                    var targetId = document.createElement("div");
                    targetId.id = cellId + "2";
                    targetId.className = "hidden";
                    cell.appendChild(targetId);
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "video") {
        for (var i = 1; i <= 15; i++) {
            var cell = cue.insertCell(i - 1);
            cell.id = cueId + i;
            var cellId = cell.id + "000";
            switch (i) {
                case 1:
                    cell.className = "cue video en";

                    var ctype = document.createElement("div");
                    ctype.className = "hidden";
                    ctype.id = cellId + "1";
                    ctype.innerHTML = cueType;
                    cell.appendChild(ctype);

                    var input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = cellId + "2";
                    input.name = "en";
                    input.checked = true;
                    input.setAttribute('onchange', 'updateCheckStatus(' + cue.id + ', this.checked)');
                    cell.appendChild(input);
                    
                    var checkStatus = document.createElement("div");
                    checkStatus.className = "hidden";
                    checkStatus.id = cellId + "3";
                    checkStatus.innerHTML = "checked";
                    cell.appendChild(checkStatus);
                    
                    var filename = document.createElement("div");
                    filename.className = "hidden";
                    filename.id = cellId + "4";
                    cell.appendChild(filename);
                    break;
                case 2:
                    cell.className = "cue video q";
                    cell.innerHTML = cue.id;
                    break;
                case 3:
                    cell.className = "cue video hkey";
                    break;
                case 4:
                    cell.className = "cue video notes";

                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "hidden long";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    cell.className = "cue video desc progress";
                    
                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cellId + "1";
                    input.className = "long hidden";
                    cell.appendChild(input);

                    var display = document.createElement("div");
                    display.id = cellId + "2";
                    display.className = "display long visible";
                    cell.appendChild(display);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    cell.className = "cue video dur";

                    var displaydur = document.createElement("div");
                    displaydur.id = cellId + "1";
                    displaydur.className = "visible";
                    cell.appendChild(displaydur);
                    
                    var startPos = document.createElement("div");
                    startPos.id = cellId + "2";
                    startPos.className = "hidden";
                    cell.appendChild(startPos);
                    
                    var stopPos = document.createElement("div");
                    stopPos.id = cellId + "3";
                    stopPos.className = "hidden";
                    cell.appendChild(stopPos);
                    
                    var fadeIn = document.createElement("div");
                    fadeIn.id = cellId + "4";
                    fadeIn.className = "hidden";
                    cell.appendChild(fadeIn);
                    
                    var fadeOut = document.createElement("div");
                    fadeOut.id = cellId + "5";
                    fadeOut.className = "hidden";
                    cell.appendChild(fadeOut);
                    
                    var fullfileduration = document.createElement("div");
                    fullfileduration.id = cellId + "6";
                    fullfileduration.className = "hidden";
                    cell.appendChild(fullfileduration);
                    break;
                case 7:
                    cell.className = "cue video elapsed";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 8:
                    cell.className = "cue video remaining";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 9:
                    cell.className = "cue video vol";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 10:
                    cell.className = "cue video pan";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 11:
                    cell.className = "cue video pitch";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 12:
                    cell.className = "cue video loops";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 13:
                    cell.className = "cue video output";
                    
                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.classname = "visible";
                    cell.appendChild(display);

                    var output = document.createElement("div"); // Audio output
                    output.id = cellId + "2";
                    output.classname = "visible";
                    cell.appendChild(output);
                    break;
                case 14:
                    cell.className = "cue video action";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);
                    break;
                case 15:
                    cell.className = "cue video target";

                    var display = document.createElement("div");
                    display.id = cellId + "1";
                    display.className = "visible";
                    cell.appendChild(display);

                    var targetId = document.createElement("div");
                    targetId.id = cellId + "2";
                    targetId.className = "hidden";
                    cell.appendChild(targetId);
                    break;
                default:
                    break;
            }
        }
    }
    cueListLength++;
    moveCue(cueListLength, currentCue + 1); // Move to insertion point
    initializeCue(currentCue + 1);
    setSavedIndicator(false);
    updateUndoRedoStack();

    // Open local file selection dialog
    if (cueType === "audio") {
        editCue(currentCue + 1);
        document.getElementById("edit_file").click(); // Pull up the file upload menu for new audio cues
    }

    return cue;
}

function updateCueNumber(currNum, shift) {
    if (currNum + shift < 1) {
        console.log("Cannot update cue. Cue number " + (currNum + shift) + " is invalid. Cue number cannot be less than 1.");
        return;
    }

    var cue = document.getElementById(currNum);
    var cueType = getType(currNum);
    var newCueIdNoZeroes = String(currNum + shift);
    var newCueId = newCueIdNoZeroes + "000";

    if (cueType === "audio" || cueType === "blank_audio") {
        for (var i = 1; i <= cue.cells.length; i++) {
            var cell = cue.cells[i - 1];
            var oldCellId = cell.id + "000";
            cell.id = newCueId + i;
            var newCellId = cell.id + "000";
            switch (i) {
                case 1:
                    var ctype = document.getElementById(oldCellId + "1");
                    ctype.id = newCellId + "1";
                    var engaged = document.getElementById(oldCellId + "2");
                    engaged.id = newCellId + "2";
                    engaged.setAttribute('onchange', 'updateCheckStatus(' + newCueIdNoZeroes + ', this.checked)');
                    var checkStatus = document.getElementById(oldCellId + "3");
                    checkStatus.id = newCellId + "3";
                    var filename = document.getElementById(oldCellId + "4");
                    filename.id = newCellId + "4";
                    break;
                case 2:
                    cell.innerHTML = newCueIdNoZeroes;
                    break;
                case 3:
                    break;
                case 4:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    var displaydur = document.getElementById(oldCellId + "1");
                    displaydur.id = newCellId + "1";
                    var startPos = document.getElementById(oldCellId + "2");
                    startPos.id = newCellId + "2";
                    var stopPos = document.getElementById(oldCellId + "3");
                    stopPos.id = newCellId + "3";
                    var fadeIn = document.getElementById(oldCellId + "4");
                    fadeIn.id = newCellId + "4";
                    var fadeOut = document.getElementById(oldCellId + "5");
                    fadeOut.id = newCellId + "5";
                    var fullfilelength = document.getElementById(oldCellId + "6");
                    fullfilelength.id = newCellId + "6";
                    break;
                case 7:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 8:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 9:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 10:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 11:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 12:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 13:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 14:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 15:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    var targetId = document.getElementById(oldCellId + "2");
                    targetId.id = newCellId + "2";
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "wait") {
        for (var i = 1; i <= cue.cells.length; i++) {
            var cell = cue.cells[i - 1];
            var oldCellId = cell.id + "000";
            cell.id = newCueId + i;
            var newCellId = cell.id + "000";
            switch (i) {
                case 1:
                    var ctype = document.getElementById(oldCellId + "1");
                    ctype.id = newCellId + "1";
                    var engaged = document.getElementById(oldCellId + "2");
                    engaged.id = newCellId + "2";
                    engaged.setAttribute('onchange', 'updateCheckStatus(' + newCueIdNoZeroes + ', this.checked)');
                    var checkStatus = document.getElementById(oldCellId + "3");
                    checkStatus.id = newCellId + "3";
                    var filename = document.getElementById(oldCellId + "4");
                    filename.id = newCellId + "4";
                    break;
                case 2:
                    cell.innerHTML = newCueIdNoZeroes;
                    break;
                case 3:
                    break;
                case 4:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    var displaydur = document.getElementById(oldCellId + "1");
                    displaydur.id = newCellId + "1";
                    var startPos = document.getElementById(oldCellId + "2");
                    startPos.id = newCellId + "2";
                    var stopPos = document.getElementById(oldCellId + "3");
                    stopPos.id = newCellId + "3";
                    var fadeIn = document.getElementById(oldCellId + "4");
                    fadeIn.id = newCellId + "4";
                    var fadeOut = document.getElementById(oldCellId + "5");
                    fadeOut.id = newCellId + "5";
                    var fullfilelength = document.getElementById(oldCellId + "6");
                    fullfilelength.id = newCellId + "6";
                    break;
                case 7:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 8:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 9:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 10:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 11:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 12:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 13:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 14:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 15:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    var targetId = document.getElementById(oldCellId + "2");
                    targetId.id = newCellId + "2";
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "memo") {
        for (var i = 1; i <= cue.cells.length; i++) {
            var cell = cue.cells[i - 1];
            if (i === 3)
                i = 5; // Maintain id for description cell; even though it sits in cell 3 for memos it should be id 5
            var oldCellId = cell.id + "000";
            cell.id = newCueId + i;
            var newCellId = cell.id + "000";
            switch (i) {
                case 1:
                    var ctype = document.getElementById(oldCellId + "1");
                    ctype.id = newCellId + "1";
                    var engaged = document.getElementById(oldCellId + "2");
                    engaged.id = newCellId + "2";
                    engaged.setAttribute('onchange', 'updateCheckStatus(' + newCueIdNoZeroes + ', this.checked)');
                    var checkStatus = document.getElementById(oldCellId + "3");
                    checkStatus.id = newCellId + "3";
                    var filename = document.getElementById(oldCellId + "4");
                    filename.id = newCellId + "4";
                    break;
                case 2:
                    cell.innerHTML = newCueIdNoZeroes;
                    break;
                case 5:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                default:
                    break;
            }
        }
    } else if (cueType === "control") {
        for (var i = 1; i <= cue.cells.length; i++) {
            var cell = cue.cells[i - 1];
            var oldCellId = cell.id + "000";
            cell.id = newCueId + i;
            var newCellId = cell.id + "000";
            switch (i) {
                case 1:
                    var ctype = document.getElementById(oldCellId + "1");
                    ctype.id = newCellId + "1";
                    var engaged = document.getElementById(oldCellId + "2");
                    engaged.id = newCellId + "2";
                    engaged.setAttribute('onchange', 'updateCheckStatus(' + newCueIdNoZeroes + ', this.checked)');
                    var checkStatus = document.getElementById(oldCellId + "3");
                    checkStatus.id = newCellId + "3";
                    break;
                case 2:
                    cell.innerHTML = newCueIdNoZeroes;
                    break;
                case 4:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    var displaydur = document.getElementById(oldCellId + "1");
                    displaydur.id = newCellId + "1";
                    var fullfilelength = document.getElementById(oldCellId + "6");
                    fullfilelength.id = newCellId + "6";
                    break;
                case 7:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 8:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 9:
                    break;
                case 10:
                    break;
                case 11:
                    break;
                case 12:
                    break;
                case 13:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 14:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    var ctrlAction = document.getElementById(oldCellId + "2");
                    ctrlAction.id = newCellId + "2";
                    var param = document.getElementById(oldCellId + "3");
                    param.id = newCellId + "3";
                    break;
                case 15:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    var targetId = document.getElementById(oldCellId + "2");
                    targetId.id = newCellId + "2";
                    var ctrlTargetId = document.getElementById(oldCellId + "3");
                    ctrlTargetId.id = newCellId + "3";
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "image") {
        for (var i = 1; i <= cue.cells.length; i++) {
            var cell = cue.cells[i - 1];
            var oldCellId = cell.id + "000";
            cell.id = newCueId + i;
            var newCellId = cell.id + "000";
            switch (i) {
                case 1:
                    var ctype = document.getElementById(oldCellId + "1");
                    ctype.id = newCellId + "1";
                    var engaged = document.getElementById(oldCellId + "2");
                    engaged.id = newCellId + "2";
                    engaged.setAttribute('onchange', 'updateCheckStatus(' + newCueIdNoZeroes + ', this.checked)');
                    var checkStatus = document.getElementById(oldCellId + "3");
                    checkStatus.id = newCellId + "3";
                    var filename = document.getElementById(oldCellId + "4");
                    filename.id = newCellId + "4";
                    break;
                case 2:
                    cell.innerHTML = newCueIdNoZeroes;
                    break;
                case 3:
                    break;
                case 4:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    var displaydur = document.getElementById(oldCellId + "1");
                    displaydur.id = newCellId + "1";
                    var startPos = document.getElementById(oldCellId + "2");
                    startPos.id = newCellId + "2";
                    var stopPos = document.getElementById(oldCellId + "3");
                    stopPos.id = newCellId + "3";
                    var fadeIn = document.getElementById(oldCellId + "4");
                    fadeIn.id = newCellId + "4";
                    var fadeOut = document.getElementById(oldCellId + "5");
                    fadeOut.id = newCellId + "5";
                    var isTimeBased = document.getElementById(oldCellId + "6");
                    isTimeBased.id = newCellId + "6";
                    break;
                case 7:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 8:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 9:
                    break;
                case 10:
                    break;
                case 11:
                    break;
                case 12:
                    break;
                case 13:
                    var output = document.getElementById(oldCellId + "1");
                    output.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    break;
                case 14:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 15:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    var targetId = document.getElementById(oldCellId + "2");
                    targetId.id = newCellId + "2";
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "video") {
        for (var i = 1; i <= cue.cells.length; i++) {
            var cell = cue.cells[i - 1];
            var oldCellId = cell.id + "000";
            cell.id = newCueId + i;
            var newCellId = cell.id + "000";
            switch (i) {
                case 1:
                    var ctype = document.getElementById(oldCellId + "1");
                    ctype.id = newCellId + "1";
                    var engaged = document.getElementById(oldCellId + "2");
                    engaged.id = newCellId + "2";
                    engaged.setAttribute('onchange', 'updateCheckStatus(' + newCueIdNoZeroes + ', this.checked)');
                    var checkStatus = document.getElementById(oldCellId + "3");
                    checkStatus.id = newCellId + "3";
                    var filename = document.getElementById(oldCellId + "4");
                    filename.id = newCellId + "4";
                    break;
                case 2:
                    cell.innerHTML = newCueIdNoZeroes;
                    break;
                case 3:
                    break;
                case 4:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    var input = document.getElementById(oldCellId + "1");
                    input.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    var displaydur = document.getElementById(oldCellId + "1");
                    displaydur.id = newCellId + "1";
                    var startPos = document.getElementById(oldCellId + "2");
                    startPos.id = newCellId + "2";
                    var stopPos = document.getElementById(oldCellId + "3");
                    stopPos.id = newCellId + "3";
                    var fadeIn = document.getElementById(oldCellId + "4");
                    fadeIn.id = newCellId + "4";
                    var fadeOut = document.getElementById(oldCellId + "5");
                    fadeOut.id = newCellId + "5";
                    var fullfilelength = document.getElementById(oldCellId + "6");
                    fullfilelength.id = newCellId + "6";
                    break;
                case 7:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 8:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 9:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 10:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 11:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 12:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 13:
                    var output = document.getElementById(oldCellId + "1");
                    output.id = newCellId + "1";
                    var display = document.getElementById(oldCellId + "2");
                    display.id = newCellId + "2";
                    break;
                case 14:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    break;
                case 15:
                    var display = document.getElementById(oldCellId + "1");
                    display.id = newCellId + "1";
                    var targetId = document.getElementById(oldCellId + "2");
                    targetId.id = newCellId + "2";
                    break;
                default:
                    break;
            }
        }
    }
    return cue;
}

// The following functions ensure that the input elements beneath display elements stay in sync when raw HTML is copied.
function updateCheckStatus(cueNum, checked) {
    checked = checked || getEnabled(cueNum);
    if (checked)
        setCheckStatus(cueNum, "checked");
    else
        setCheckStatus(cueNum, "unchecked");
}

function restoreCheckStatus(cueNum) {
    setEnabled(cueNum, getCheckStatus(cueNum) === "checked");
}

function updateAllCheckStatus() {
    for (var i = 1; i <= cueListLength; i++) {
        updateCheckStatus(i);
    }
}

function restoreAllCheckStatus() {
    for (var i = 1; i <= cueListLength; i++) {
        restoreCheckStatus(i);
    }
}

function restoreNotes(cueNum) {
    setNotes(cueNum, getNotes(cueNum));
}

function restoreDesc(cueNum) {
    setDesc(cueNum, getDesc(cueNum));
}

function moveCue(currNum, insertPoint) {
    if (insertPoint > cueListLength) {
        onscreenAlert("Cannot move cue. Cue number " + insertPoint + " is greater than cue list length.", 5);
        return false;
    } else if (insertPoint < 1) {
        onscreenAlert("Cannot move cue. Cue number " + insertPoint + " is invalid.", 5);
        return false;
    }

    // Disallow moving cues when an active or primed cue lies in the range of the move
    if (currNum < insertPoint) {
        for (var i = currNum; i <= insertPoint; i++) {
            if (typeof activeCues !== "undefined" && activeCues[i] || typeof primed !== "undefined" && primed[i]) {
                onscreenAlert("Cannot move cue. There is an active or primed cue in range.");
                return false;
            }
        }
    } else {
        for (var i = currNum; i >= insertPoint; i--) {
            if (typeof activeCues !== "undefined" && activeCues[i] || typeof primed !== "undefined" && primed[i]) {
                onscreenAlert("Cannot move cue. There is an active or primed cue in range.");
                return false;
            }
        }
    }

    var cueList = document.getElementById("cue_list");
    var cue = document.getElementById(currNum);
    var tempCue = updateCueNumber(currNum, insertPoint - currNum).innerHTML; // Update inner cue info to match final position and store in temp
    cue.innerHTML = ""; // Overwrite to avoid duplicate id's

    if (currNum < insertPoint) {
        for (var i = currNum + 1; i <= insertPoint; i++) {
            cueList.rows[i - 1].innerHTML = updateCueNumber(i, -1).innerHTML;
            cueList.rows[i].innerHTML = ""; // Overwrite to avoid duplicate id's
        }
    } else if (currNum > insertPoint) {
        for (var i = currNum - 1; i >= insertPoint; i--) {
            cueList.rows[i + 1].innerHTML = updateCueNumber(i, 1).innerHTML;
            cueList.rows[i].innerHTML = "" // Overwrite to avoid duplicate id's
        }
    }

    // Move cue to final position
    cueList.rows[insertPoint].innerHTML = tempCue;
    restoreAllCheckStatus(); // Restore all checkbox statuses from checkStatus div
    // Do not call setSavedIndicator or updateUndoRedoStack
    // Function is only called from within other functions which handle the indicator and stacks
    return true;
}

function increaseCueNum(currNum) {
    currNum = currNum || currentCue;
    if (moveCue(currNum, currNum + 1))
        select(currNum + 1);

    setSavedIndicator(false);
    updateUndoRedoStack();
}

function decreaseCueNum(currNum) {
    currNum = currNum || currentCue;
    if (moveCue(currNum, currNum - 1))
        select(currNum - 1);

    setSavedIndicator(false);
    updateUndoRedoStack();
}

function deleteCue(cueNum, silent) {
    cueNum = cueNum || currentCue;
    silent = silent || false;
    
    if (!silent && !confirm("Delete Cue #" + cueNum + "?")) 
        return;
    
    var cueList = document.getElementById("cue_list");
    var cue = document.getElementById(cueNum);
    
    moveCue(cueNum, cueListLength); // Move deleted cue to last row
    cueList.deleteRow(cueListLength); // Delete last row
    cueListLength--;
    
    if (cueListLength === 0) {
        currentCue = 0; // Create cue initially inserts cue at currentCue + 1
        createCue("blank_audio");
        currentCue = 1;
    }
    
    if (cueNum > cueListLength)
        select(cueNum - 1);
    else
        select(cueNum);
        
    console.log("Deleted Cue #" + cueNum + ".");
    setSavedIndicator(false);
    updateUndoRedoStack();
}

function undo() {
    if (undoStack.length < 2) {
        onscreenInfo("Nothing to undo.");
        return;
    }
    if (Object.keys(activeCues).length > 0 || Object.keys(primed).length > 0) {
        onscreenAlert("Cannot undo during active or primed cue.");
        return;
    }

    // Pop current state to redo
    redoStack.push(undoStack.pop());

    // Replace cue list content with state of current undo level
    var cueList = document.getElementById("cue_list");
    cueList.innerHTML = undoStack.pop();
    
    // Restore normal things
    cueListLength = cueList.rows.length - 1; // Subtract 1 for table header
    select(currentCue); // Preserve selected cue unless out of range
    restoreAllCheckStatus(); // Restore status of check boxes
    // Reset all progress bars (if user saved during playback, inline styling saves the progress bar position)
    for (var i = 1; i <= cueListLength; i++) {
        resetProgressBar(i);
    }

    // Push current state back onto undo stack
    undoStack.push(getCueListHTML()); 

    // Set saved indicator to false without clearing the redo stack
    show("saved_indicator");
    isSaved = false;
}

function redo() {
    if (redoStack.length == 0) {
        onscreenInfo("Nothing to redo.");
        return;
    }
    if (Object.keys(activeCues).length > 0 || Object.keys(primed).length > 0) {
        onscreenAlert("Cannot undo during active or primed cue.");
        return;
    }

    // Replace cue list content with state of current redo level
    var cueList = document.getElementById("cue_list");
    cueList.innerHTML = redoStack.pop();

    // Restore normal things
    cueListLength = cueList.rows.length - 1; // Subtract 1 for table header
    select(currentCue); // Preserve selected cue unless out of range
    restoreAllCheckStatus(); // Restore status of check boxes
    // Reset all progress bars (if user saved during playback, inline styling saves the progress bar position)
    for (var i = 1; i <= cueListLength; i++) {
        resetProgressBar(i);
    }

    // Push current state back onto undo stack
    undoStack.push(getCueListHTML()); 

    // Set saved indicator to false without clearing the redo stack
    show("saved_indicator");
    isSaved = false;
}