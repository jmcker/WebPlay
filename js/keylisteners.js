var editingField = false;
var editingTitle = false;
var newCueOpen = false;
var editingCue = false;

// Handle keypresses for main window and display windows
function keyHandler(event) {
    event = event || window.event;

    if (!(editingField || editingTitle || newCueOpen || editingCue)) {
        
        /******** Action Buttons ********/
        // GO - Spacebar
        if (event.keyCode == 32) {
            go();
            event.preventDefault();
        }
        
        // STOP ALL - Escape
        if (event.keyCode == 27) {
            stopAll();
        }

        // FADE ALL - Backspace
        if (event.keyCode == 8) {
            fadeAll();
        }
        
        /******** Production ********/
        // Save - Ctrl-S
        if (event.keyCode == 83 && event.ctrlKey) {
            saveProductionFile();
            event.preventDefault();
        }
            
        /******** Cue ********/
        // New audio cue - Ctrl-Shift-A
        if (event.keyCode == 65 && event.ctrlKey && event.shiftKey) {
            createCue("audio");
        }
        
        // New blank audio cue - Ctrl-Shift-B
        if (event.keyCode == 66 && event.ctrlKey && event.shiftKey) {
            createCue("blank_audio");
            event.preventDefault();
        }
        
        // New wait cue - Ctrl-Shift-X          !W overridden by Chrome!
        if (event.keyCode == 88 && event.ctrlKey && event.shiftKey) {
            createCue("wait");
            event.preventDefault();
        }
        
        // New memo cue - Ctrl-Shift-M
        if (event.keyCode == 77 && event.ctrlKey && event.shiftKey) {
            createCue("memo");
            event.preventDefault();
        }
        
        // New control cue - Ctrl-Shift-C
        if (event.keyCode == 67 && event.ctrlKey && event.shiftKey) {
            createCue("control");
            event.preventDefault();
        }

        // New image cue - Ctrl-Shift-I
        if (event.keyCode == 73 && event.ctrlKey && event.shiftKey) {
            createCue("image");
            event.preventDefault();
        }

        // New video cue - Ctrl-Shift-V
        if (event.keyCode == 86 && event.ctrlKey && event.shiftKey) {
            createCue("video");
            event.preventDefault();
        }
        
        // Edit cue - Ctrl-E
        if (event.keyCode == 69 && event.ctrlKey) {
            editCue();
            event.preventDefault();
        }
        
        // Delete cue - Ctrl-delete
        if (event.keyCode == 46 && event.ctrlKey) {
            deleteCue();
        }

        // Move cue up - Ctrl-up arrow
        if (event.keyCode == 38 && event.ctrlKey) {
            decreaseCueNum();
        }

        // Move cue down - Ctrl-down arrow
        if (event.keyCode == 40 && event.ctrlKey) {
            increaseCueNum();
        }
        
        /******** UI ********/
        // Listen for up arrow key
        if (event.keyCode == 38 && !event.ctrlKey) {
            if (currentCue > 1) {
                currentCue--;
            }
            select(currentCue);
        }

        // Listen for down arrow key
        if (event.keyCode == 40 && !event.ctrlKey) {
            if (currentCue < cueListLength) {
                currentCue++;
            }
            select(currentCue);
        }
        
    }

    // Listen for escape but don't kill playing sounds.
    if (event.keyCode == 27 && !previewing) {
        closeAll();
        hideNewCueMenu();
        hideEditCueMenu();
    }
    // Listen for enter or ctrl-s when a cue list field is being edited.
    if (editingField) {
        if ((event.keyCode == 10 || event.keyCode == 13)) {
            closeAll();
        }
        if (event.keyCode == 83 && event.ctrlKey) {
            closeAll(); // Calls saveAll()
        }
    }
    // Listen for control enter when title edit is selected.
    if (editingTitle) {
        if ((event.keyCode == 10 || event.keyCode == 13)) {
            closeTitle(true);
        }
    }
    // Listen for enter in the new cue window.
    if (newCueOpen) {
        if ((event.keyCode == 10 || event.keyCode == 13)) {
            createCue();
        }
    }
    // Listen for ctrl-enter in the edit cue window.
    if (editingCue) {
        if ((event.keyCode == 10 || event.keyCode == 13) && event.ctrlKey) {
            saveEditedCue();
        }
    }
    // Listen to stop for escape in the edit cue window when previewing.
    if (editingCue && previewing) {
        if ((event.keyCode == 27))
            previewing.stop();
    }
}

// A completely pointless method because the variables are global, but it simplifies setting them all
function keyListeners(editingField1, editingTitle1, newCueOpen1, editingCue1) {
    editingField = editingField1;
    editingTitle = editingTitle1;
    newCueOpen = newCueOpen1;
    editingCue = editingCue1;
}

document.addEventListener("keydown", keyHandler);

// Warning before page unload - unsaved changes, currently playing, currently viewing
window.addEventListener("beforeunload", function(event) {
    var msg = "Discard unsaved changes to production?";
    
    if (!isSaved || editingCue || Object.keys(activeCues).length > 0) {
        event.returnValue = msg;
        return msg;
    }
});

window.onunload = function() {
    closeAllDisplays(true);
    // TODO: save position information for restoring
}

// Handle mobile sizing of the fixed menu bar in this obscene way
function isMobile() {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
};

if (isMobile()) {
    document.getElementById("header").style.position = "absolute";
}