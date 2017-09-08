var currentCue = 1;
var cueListLength = 0;

createCue("audio");
select(currentCue);
keyListeners(false, false, false, false);

function show(id) {
    var element = document.getElementById(id);
    element.className = element.className.replace("hidden", "visible");
}

function hide(id) {
    var element = document.getElementById(id);
    element.className = element.className.replace("visible", "hidden");
}

function save(element) {
    var id = element.id;
    alert(id + 1);
    var display = document.getElementById(id + 1);
    display.innerHTML = element.value;
}

function open(element) {
    var id = element.id;
    var display = document.getElementById((id + 1));
    element.className = element.className.replace("hidden", "open");
    hide((id + 1)); // Hide display element to show edit box
}

function close(element) {
    var id = element.id;
    element.className = element.className.replace("open", "hidden");
    show((id + 1)); // Show display element in place of edit box
}

function saveAll() {
    var opened = document.getElementsByClassName("open");
    for (var i = 0; i < opened.length; i++) {
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
    open(element);
    element.select();

    keyListeners(true, false, false, false);
}

function editTitle() {
    show("edit_title");
    show("save_title");
    show("cancel_title");
    hide("display_title");

    var text = document.getElementById("edit_title");
    text.focus();

    keyListeners(false, true, false, false);
}

function closeTitle(saveChanges) {
    hide("edit_title");
    hide("save_title");
    hide("cancel_title");
    show("display_title");

    var text = document.getElementById("edit_title");
    var display = document.getElementById("display_title");
    if (saveChanges) {
        if (text.value.length === "") {
            display.innerHTML = "<empty>";
        } else {
            display.innerHTML = text.value;
        }
    } else {
        text.value = display.innerHTML;
    }

    keyListeners(false, false, false, false);
}

function editCurrentCue(cueNum) {
    cueNum = cueNum || currentCue;
    var cue = document.getElementById(currentCue);




    // Set menu values




    showEditCueMenu();
}

function saveEditedCue(cueNum) {
    cueNum = cueNum || currentCue;
    var cue = document.getElementById(currentCue);

    hideEditCueMenu();
    // Save actual values and ? reset menu values





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
    hide("edit_cue_menu");
    keyListeners(false, false, false, false);
}

function select(cueNum) {
    var cues = document.getElementsByClassName("selected");
    // Check if there is a selected cue and if we're already on the desired one
    if (cues[0] && cues[0].id == cueNum) {
        return 0;
    } else if (cues[0]) {
        cues[0].className = cues[0].className.replace("selected", "deselected");
        closeAll();
    }

    var selCue = document.getElementById(cueNum);
    if (selCue) {
        selCue.className = selCue.className.replace("deselected", "selected");
        currentCue = cueNum; // Global tracker
    }
}

function getType(cueNum) {
    return document.getElementById(cueNum + "11").value;
}

function download() {
    document.location = 'data:text/attachment;base64,' + utf8_to_b64("<!DOCTYPE html><html>" + document.documentElement.innerHTML + "</html>");
}

function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function createCue(cueType) {
    var cueList = document.getElementById("cue_list");
    cueType = cueType || document.getElementById("cue_type").value;
    var cueData = [];

    // Disable middle of cue list insertion until updateCueNumber is complete
    // var cueRow = cueList.insertRow(currentCue + 1);
    var cueRow = cueList.insertRow(cueListLength + 1);
    var cueId = String(cueListLength + 1);
    cueRow.id = cueId;
    cueRow.className = "cueRow deselected";
    cueRow.setAttribute('onclick', 'select(' + cueRow.id + ')');

    if (cueType === "audio" || cueType === "blank_audio") {
        for (var i = 1; i <= 13; i++) {
            var cell = cueRow.insertCell(i - 1);
            cell.id = cueId + i;
            switch (i) {
                case 1:
                    cell.className = "cue en";

                    var ctype = document.createElement("input");
                    ctype.type = "hidden";
                    ctype.id = cell.id + "1";
                    ctype.name = "cuetype";
                    ctype.value = cueType;
                    cell.appendChild(ctype);

                    var input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = cell.id + "2";
                    input.name = "en";
                    input.checked = true;
                    cell.appendChild(input);
                    break;
                case 2:
                    cell.className = "cue q";
                    cell.innerHTML = cueId;
                    break;
                case 3:
                    cell.className = "cue hkey";
                    break;
                case 4:
                    cell.className = "cue notes";

                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cell.id + "1";
                    input.className = "hidden long";
                    input.value = "";

                    var div = document.createElement("div");
                    div.id = cell.id + "2";
                    div.className = "display long visible";
                    div.innerHTML = cueId;

                    cell.appendChild(input);
                    cell.appendChild(div);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    cell.className = "cue desc";

                    var input = document.createElement("input");
                    input.type = "text";
                    input.id = cell.id + "1";
                    input.className = "hidden long";
                    input.value = "";

                    var div = document.createElement("div");
                    div.id = cell.id + "2";
                    div.className = "display long visible";
                    div.value = "";

                    cell.appendChild(input);
                    cell.appendChild(div);

                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    cell.className = "cue dur";
                    break;
                case 7:
                    cell.className = "cue elapsed";
                    break;
                case 8:
                    cell.className = "cue remaining";
                    break;
                case 9:
                    cell.className = "cue vol";
                    break;
                case 10:
                    cell.className = "cue pan";
                    break;
                case 11:
                    cell.className = "cue pitch";
                    break;
                case 12:
                    cell.className = "cue loops";
                    break;
                case 13:
                    cell.className = "cue action";
                    break;
                default:
                    break;
            }
            cueData.push(cell);
        }
    } else if (cueType === "memo") {
        var cell = cueRow.insertCell(0);
        cell.id = cueId + "1";
        cell.colSpan = 13;
        cell.className = "cue memo";

        var ctype = document.createElement("input");
        ctype.type = "hidden";
        ctype.id = cell.id + "1";
        ctype.name = "cuetype";
        ctype.value = cueType;
        cell.appendChild(ctype);

        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = cell.id + "2";
        checkbox.className = "hidden";
        checkbox.name = "en";
        checkbox.checked = false;
        cell.appendChild(checkbox);

        var input = document.createElement("input");
        input.type = "text";
        input.id = cell.id + "3";
        input.className = "long hidden";
        input.value = "";

        var div = document.createElement("div");
        div.id = cell.id + "4";
        div.className = "display long visible";
        div.value = "";

        cell.appendChild(input);
        cell.appendChild(div);

        cell.setAttribute('onclick', 'edit(' + input.id + ')');
    }
    cueListLength++;
}

function updateCueNumber(currNum, shift) {
    if (currNum + shift <= 0) {
        console.log("Cannot update cue. Cue number " + (currNum + shift) + " is invalid. Cue number cannot be less than 1.");
        return;
    }

    var cue = document.getElementById(currNum);
    var cueType = getType(currNum);
    var newCueId = String(currNum + shift);
    // Don't need to change row info because tr shuffle in moveCue() leaves outer shells in place
    //cue.id = newCueId;
    //cue.setAttribute('onclick', 'select(' + newCueId + ')');

    if (cueType === "audio" || cueType === "blank_audio") {
        for (var i = 1; i <= cue.cells.length; i++) {
            var cell = cue.cells[i - 1];
            var oldCellId = cell.id;
            cell.id = newCueId + i;
            switch (i) {
                case 1:
                    var ctype = document.getElementById(oldCellId + "1");
                    var input = document.getElementById(oldCellId + "2");
                    ctype.id = cell.id + "1";
                    input.id = cell.id + "2";
                    break;
                case 2:
                    cell.innerHTML = newCueId;
                    break;
                case 3:
                    break;
                case 4:
                    var input = document.getElementById(oldCellId + "1");
                    var div = document.getElementById(oldCellId + "2");
                    input.id = cell.id + "1";
                    div.id = cell.id + "2";
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 5:
                    var input = document.getElementById(oldCellId + "1");
                    var div = document.getElementById(oldCellId + "2");
                    input.id = cell.id + "1";
                    div.id = cell.id + "2";
                    cell.setAttribute('onclick', 'edit(' + input.id + ')');
                    break;
                case 6:
                    break;
                case 7:
                    break;
                case 8:
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
                    break;
                default:
                    break;
            }
        }
    } else if (cueType === "memo") {
        var oldCellId = currNum + "1";
        var cell = document.getElementById(oldCellId);
        cell.id = newCueId + "1";

        var ctype = document.getElementById(oldCellId + "1");
        ctype.id = cell.id + "1";

        var checkbox = document.getElementById(oldCellId + "2");
        checkbox.id = cell.id + "2";

        var input = document.getElementById(oldCellId + "3");
        input.id = cell.id + "3";

        var div = document.getElementById(oldCellId + "4");
        div.id = cell.id + "4";

        cell.setAttribute('onclick', 'edit(' + input.id + ')');
    }
    return cue;
}

function moveCue(currNum, insertPoint) {
    if (insertPoint > cueListLength) {
        console.log("Cannot move cue. Cue Number " + insertPoint + " is greater than cue list length.");
        return;
    } else if (insertPoint <= 0) {
        console.log("Cannot move cue. Cue Number " + insertPoint + " is invalid. Cue Number cannot be less than 1.");
        return;
    }

    var cueList = document.getElementById("cue_list");
    var cue = document.getElementById(currNum);
    var tempCue = updateCueNumber(currNum, insertPoint - currNum).innerHTML; // Update inner cue info to match final position and store in temp

    if (currNum < insertPoint) {
        for (var i = currNum + 1; i <= insertPoint; i++) {
            cueList.rows[i - 1].innerHTML = updateCueNumber(i, -1).innerHTML;
        }
    } else {
        for (var i = currNum - 1; i >= insertPoint; i--) {
            cueList.rows[i + 1].innerHTML = updateCueNumber(i, 1).innerHTML;
        }
    }

    // Move cue to final position
    cueList.rows[insertPoint].innerHTML = tempCue;
}

function keyListeners(cueEdit, titleEdit, newCue, editCue) {
    document.onkeydown = function(event) {
        event = event || window.event;

        if (!(cueEdit || titleEdit || newCue || editCue)) {
            // Listen for t to open edit title.
            if (event.keyCode == 84) {
                editTitle();
                event.preventDefault();
            }

            // Listen for up arrow key
            if (event.keyCode == 38) {
                if (currentCue > 1) {
                    currentCue--;
                }
                select(currentCue);
            }

            // Listen for down arrow key
            if (event.keyCode == 40) {
                if (currentCue < cueListLength) {
                    currentCue++;
                }
                select(currentCue);
            }
        }

        // Listen for escape.
        if (event.keyCode == 27) {
            closeAll();
            hideNewCueMenu();
            hideEditCueMenu();
        }
        // Listen for control enter when a cue list field is being edited.
        if (cueEdit) {
            if ((event.keyCode == 10 || event.keyCode == 13)) {
                closeAll();
            }
        }
        // Listen for control enter when title edit is selected.
        if (titleEdit) {
            if ((event.keyCode == 10 || event.keyCode == 13)) {
                closeTitle(true);
            }
        }
        // Listen for ctrl-enter in the new cue window.
        if (newCue) {
            if ((event.keyCode == 10 || event.keyCode == 13)) {
                createCue();
            }
        }
        // Listen for ctrl-enter in the edit cue window.
        if (editCue) {
            if ((event.keyCode == 10 || event.keyCode == 13) && event.ctrlKey) {
                saveEditedCue();
            }
        }
    };
}