var filer = new Filer();
var fs_cap = 200 * 1024 * 1024;
var fs_used = 0;
var fs_free = fs_cap;

function onError(e) {
    if (e.name !== "Error")
        onscreenAlert("Error: " + e.name);
    else
        onscreenAlert("Error: " + e.message);
    
    console.error(e);
        
    // Other codes
    /**
     * switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
          msg = 'QUOTA_EXCEEDED_ERR';
          break;
        case FileError.NOT_FOUND_ERR:
          msg = 'NOT_FOUND_ERR';
          break;
        case FileError.SECURITY_ERR:
          msg = 'SECURITY_ERR';
          break;
        case FileError.INVALID_MODIFICATION_ERR:
          msg = 'INVALID_MODIFICATION_ERR';
          break;
        case FileError.INVALID_STATE_ERR:
          msg = 'INVALID_STATE_ERR';
          break;
        default:
          msg = 'Unknown Error';
          break;
      };
     */
}

function openFS() {
    try {
        filer.init({
                persistent: true,
                size: fs_cap
            }, function(fs) {
                console.log("Opened FileSystem: " + fs.name + ".");
                
                // Load or create user configuration file
                loadUserConfig();
                
                // Move into the production directory and load the production file
                var productionName = window.location.hash.substring(1);
                if (productionName) {
                    setTitle(productionName);
                    
                    // Move into the production directory
                    filer.cd("/" + productionName, function() {
                        // Success callback: Load or create the production file
                        loadProductionFile();
                        
                        // Error callback: The production directory does not exist
                    }, function() {
                        alert("Production \"" + productionName + "\" does not exist.");
                        isSaved = true; // Prevent beforeunload warning if cancel is clicked in createProd
                        createProd(true, productionName);
                    });
                    
                // Create a new production if the hash was empty
                } else {
                    createProd(true);
                }
                
                // Unhide title box (hidden by default to prevent seeing the title flash and change)
                document.getElementById("title_container").classList.remove("hidden");
                checkQuota();
            }, function(e) {
                if (e.name == "SECURITY_ERR") {
                    onscreenAlert("SECURITY_ERR: Are you running in incognito mode?");
                    throw new Error("SECURITY_ERR");
                }
                onError(e);
            });
    } catch (e) {
        if (e.code == FileError.BROWSER_NOT_SUPPORTED) {
            onscreenAlert("BROWSER_NOT_SUPPORTED");
            throw new Error("BROWSER_NOT_SUPPORTED");
        }
    }
}

// Must update in showmenu.js
function createProd(redirectOnCancel, defaultFill, redirectOnSuccess) {
    checkQuota();

    var name = "";
    while (name === "") {
        
        if (document.hasFocus()) {
            name = prompt("Enter a name for the production:", defaultFill);
            
            // Handle cancel button
            if (name === null && document.hasFocus()) {
                if (redirectOnCancel) {
                    document.head.innerHTML = "";
                    document.body.innerHTML = "Click <a href=\"index.html\">here</a> if this page does not automatically redirect.";
                    window.location.href = "index.html";
                    return;
                }
                return;
            }
        }
        defaultFill = ""; // Clear fill after first attempt
    }
    
    // Move to root directory, create folder, and open production in current or new window
    filer.cd("/", function () {
        filer.mkdir("/" + name, true, function () {
            if (redirectOnSuccess) {
                window.open("live.html#" + name, "_blank");
            } else {
                filer.cd("/" + name);
                window.location.hash = "#" + name; // Add production name to href without refreshing
                setTitle(name);
            }

            // Update production menu file display if open
            if (window.opener && window.opener.refreshFolder) {
                window.opener.refreshFolder();
            }

        }, function () {
            document.head.innerHTML = "";
            document.body.innerHTML = "Click <a href=\"index.html\">here</a> if this page does not automatically redirect.";
            alert(name + " already exists.");
            window.location.href = "index.html";
        });
    }, onError);
}

function loadUserConfig() {
    filer.exists("/user_config.js", function() {

        // Add user config file (userConfig object) to global scope
        var script = document.createElement("script");
        script.onload = function() {

            // TODO: handle user config data

        };

        // Point script to config file and append
        script.src = filer.pathToFilesystemURL("user_config.js");
        document.body.appendChild(script); // Loading starts when appended

    }, function () {
        saveUserConfig();
    });
}

function saveUserConfig() {
    filer.write("/user_config.js", {data: "var userConfig = " + JSON.stringify(userConfig), type: "application/javascript"}, function(fileEntry, fileWriter) {
        console.log("Updated user configuration file.");
    }, onError);
}

function loadProductionFile(revert) {
    revert = revert || false;
    var prodName = getProdName();
    var prodFilePath = filer.pathToFilesystemURL(prodName + "_production.js");
    
    if (revert && !confirm("Revert production to last saved version? Any unsaved changes will be lost."))
        return;
    
    filer.exists(prodFilePath, function() {
        
        console.group("Loading production data...");
        
        // Add production file (prodData object) to global scope
        var script = document.createElement("script");
        script.onload = function() {
            
            // Restore cue list
            var cueList = document.getElementById("cue_list")
            cueList.innerHTML = prodData.cueListContent;
            cueListLength = cueList.rows.length - 1; // Subtract 1 for table header
            currentCue = parseInt(document.getElementsByClassName("selected")[0].id);
            if (cueListLength === 1) {
                console.log("Found 1 cue.");
                onscreenInfo("Loaded 1 cue.");
            } else {
                console.log("Found " + cueListLength + " cues.");
                onscreenInfo("Loaded " + cueListLength + " cues.");
            }
            // Reset all progress bars (if user saved during playback, inline styling saves the progress bar position)
            for (var i = 1; i <= cueListLength; i++) {
                resetProgressBar(i);
            }
            restoreAllCheckStatus(); // Restore status of check boxes
            
            // TODO: Restore global audio controls and outputs
            
            // Restore displays
            console.log(prodData.displayList);
            for (var i = 0; i < prodData.displayList.length; i++) {
                addDisplay(prodData.displayList[i], true);
            }
            
            // Restore styling
            document.head.innerHTML += prodData.prodStyle;
            // TODO: Figure out hiding and showing UI elements
            
            setSavedIndicator(true);
            console.log("Loaded production data.");
            console.groupEnd();
        };
        
        // Point script to production file and append
        script.src = prodFilePath;
        document.body.appendChild(script); // Loading starts when appended
        
    }, function() {
        onscreenAlert("No production file found. Save to create.", 5);
    });
}

function saveProductionFile() {
    prodData.cueListContent = getCueListHTML();
    filer.write(getProdName() + "_production.js", {data: "var prodData = " + JSON.stringify(prodData), type: "application/javascript"}, function(fileEntry, fileWriter) {
        onscreenInfo("Production saved.", 1);
        setSavedIndicator(true);
        
        // Update production menu file display if open
        if (window.opener && window.opener.refreshFolder) {
            window.opener.refreshFolder();
        }
    }, onError);
}


// Uses hidden HTML file upload button
function uploadFile() {
    var fbutt = document.getElementById("file_upload");
    fbutt.onchange = function() {
        for (var i = 0; i < fbutt.files.length; i++) {
            writeFile(fbutt.files[i].name, fbutt.files[i], true);
        }
    };
    fbutt.click();
}

function showUsage() {
    filer.df(function(used, free, cap) {
        used = toMB(used);
        free = toMB(free);
        cap = toMB(cap);
        var msg =   "Filesystem used: " + used +
                    " MB\nFilesystem free: " + free +
                    " MB\nFilesystem capacity: " + cap + " MB";
        console.log(msg);
        alert(msg);
    }, onError);
}

function checkQuota(callback) {
    filer.df(function(used, free, cap) {
        console.log("Filesystem used: " + toMB(used) +
                    " MB\nFilesystem free: " + toMB(free) +
                    " MB\nFilesystem capacity: " + toMB(cap) + " MB");
        fs_cap = cap;
        fs_used = used;
        fs_free = free;
        if (used + 10 * 1024 * 1024 > cap) // If within 10 MB of quota
            increaseQuota(25); // Increase quota by 25 MB
            
        // Update production menu file display if open
        if (window.opener && window.opener.showUsage) {
            window.opener.showUsage();
        }
    }, onError);
}

function increaseQuota(increaseAmtMB) {
    navigator.webkitPersistentStorage.requestQuota(fs_cap + increaseAmtMB * 1024 * 1024, function(grantedBytes) {
        console.log("Filesystem expanded to: " + toMB(grantedBytes));
        fs_cap = grantedBytes;
    }, onError);
}

function toMB(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
}

function writeFile(filename, file) {
    if (!file) 
        return;
    
    checkQuota();
    if (fs_used + file.size >= fs_cap)
        increaseQuota(fs_cap - (fs_used + file.size) + 1);
        
    filer.exists(filename, function() {
        // File already exists; user needs to confirm overwrite
        if (!confirm(filename + " already exists. Would you like to overwrite?")) {
            return;
        }
            
        filer.write(filename, { data: file, type: file.type }, function(fileEntry, fileWriter) {
            console.log("File " + filename + " was added to storage.");
            
            // Update production menu file display if open
            if (window.opener && window.opener.refreshFolder) {
                window.opener.refreshFolder();
            }
        }, onError);
    }, function() {
        // File does not already exist
        filer.write(filename, { data: file, type: file.type }, function(fileEntry, fileWriter) {
            console.log("File " + filename + " was added to storage.");
            
            // Update production menu file display if open
            if (window.opener && window.opener.refreshFolder) {
                window.opener.refreshFolder();
            }
        }, onError);
        
    })
    
    checkQuota();
}

function removeFile(name, silent) {

    if (!silent && !confirm("Delete " + name + "?")) {
        return;
    }

    filer.rm(name, function() {
        console.log("File " + name + " was removed from storage.");
        
        // Update production menu file display if open
        if (window.opener && window.opener.refreshFolder) {
            window.opener.refreshFolder();
        }
    }, onError);
}

// Handles restoring cue data when cue_list_content.html is loaded
// Handles retrieval of audio files
function loadFile(name, cueNum) {
    cueNum = cueNum || currentCue;
    
    var reader = new FileReader();
    try {
        filer.open(name, function(file) {

            if (file.type.match(/audio.*/)) {
                console.log("Loading audio file...");

            } else if (file.type.match(/image.*/)) {
                console.log("Loading image file...");

            } else if (file.type === "text/html") {
                console.log("Loading text/html file...");
                
                
            } else if (PREVIEWABLE_FILES.indexOf(Util.getFileExtension(file.name)) != -1) {
                // TODO: Render of text based files to selected for presentation
                
                
                
                reader.onload = function(e) {
                    var textarea = document.createElement("textarea");
                    textarea.style.width = "50%";
                    textarea.style.height = "350px";
                    textarea.textContent = e.target.result;
                    filePreview.appendChild(textarea);
                };
                reader.readAsText(file);
            } else {
                
                // Don't know what to do with the loaded file
                onscreenAlert("Unsupported file type.");
            }

        }, onError);
    } catch (e) {
        alert(e);
    }
}

function renameFile(currPath, destDir, name) {

    filer.mv(currPath, destDir, name, function(entry) {
        console.log(currPath + ' renamed to ' + entry.name + ".");
        
        // Update production menu file display if open
        if (window.opener && window.opener.refreshFolder) {
            window.opener.refreshFolder();
        }
    });
}

function renameEntry(i, name) {

    filer.mv(entries[i].fullPath, ".", name, function(entry) {
        console.log(entries[i].name + ' renamed to ' + entry.name + ".");
        entries[i] = entry;

        // Update production menu file display if open
        if (window.opener && window.opener.refreshFolder) {
            window.opener.refreshFolder();
        }
    });
}

function clearFS() {
    if (!confirm("Clear all files from FileSystem? This action cannot be undone!"))
        return;
    
    filer.ls('/', function(entries) { 
        for (var i = 0; i < entries.length; i++)
            removeFile(entries[i].name, true);
            
        logFSContents();
        setSavedIndicator(true); // Bypass unsaved changes reminder on refresh
        
        // Update production menu file display if open
        if (window.opener && window.opener.refreshFolder) {
            window.opener.refreshFolder();
        }
        
        // Force user to create new production
        window.location.hash = "";
        window.location.reload();
    }, onError);
}

function logFSContents() {
    filer.ls('.', function(entries) { console.dir(entries); }, onError);
}

function onImport(e) {
    var files = e.target.files;
    if (files.length) {
        var count = 0;
        Util.toArray(files).forEach(function(file, i) {

            var folders = file.webkitRelativePath.split("/");
            folders = folders.slice(0, folders.length - 1);

            // Add each directory. If it already exists, then a noop.
            mkdir(folders.join("/"), function(dirEntry) {
                var path = file.webkitRelativePath;

                ++count;

                // Write each file by it's path. Skipt "/." (which is a directory).
                if (path.lastIndexOf("/.") != path.length - 2) {
                    writeFile(path, file, false);
                    if (count == files.length) {
                        filer.ls(".", renderEntries, onError); // Rerender view on final file.
                    }
                }
            });
        });
    }
}

function DnDFileController(selector, onDropCallback) {
    var el_ = document.querySelector(selector);

    this.dragenter = function(e) {
        e.stopPropagation();
        e.preventDefault();
        el_.classList.add("dropping");
    };

    this.dragover = function(e) {
        e.stopPropagation();
        e.preventDefault();
    };

    this.dragleave = function(e) {
        e.stopPropagation();
        e.preventDefault();
        //el_.classList.remove("dropping");
    };

    this.drop = function(e) {
        e.stopPropagation();
        e.preventDefault();

        el_.classList.remove("dropping");

        onDropCallback(e.dataTransfer.files, e);
    };

    el_.addEventListener("dragenter", this.dragenter, false);
    el_.addEventListener("dragover", this.dragover, false);
    el_.addEventListener("dragleave", this.dragleave, false);
    el_.addEventListener("drop", this.drop, false);
}

function addListeners() {

    var dnd = new DnDFileController("body", function(files, e) {
        var items = e.dataTransfer.items;
        for (var i = 0; i < items.length; i++) {
            filer.cp(items[i].webkitGetAsEntry(), filer.cwd, null, function(entry) {
                addEntryToList(entry);
            });
        }
    });
}

window.addEventListener("DOMContentLoaded", function(e) {
    addListeners();
});