var userConfig = {};
var filer = new Filer();
var fs_cap = 200 * 1024 * 1024;
var fs_used = 0;
var fs_free = fs_cap;

var entries = []; // Cache of current working directory's entries.
var currentProd = 1;
var plainTextPreview = false;
refreshFolder();

// If the OS doesn't recognize certain types, let's help it. These (extra) types
// will be read as plaintext.
var PREVIEWABLE_FILES = [
    ".as",
    ".txt",
    ".pl",
    ".h",
    ".cc", ".cpp",
    ".csv", ".tsv",
    ".js",
    ".sh",
    ".html"
];
var filePreviewCont = document.getElementById("file_preview_inner");
var filePreview = document.getElementById("file_preview");

function onscreenAlert(text, expiration) {
    expiration = expiration || 3;
    var bar = document.getElementById("alert_bar");
    bar.innerHTML = text;
    setTimeout(function() {
        bar.innerHTML = "";
    }, expiration * 1000);
    console.log("Onscreen Alert: " + text);
}

function onError(e) {
    if (e.name !== "Error")
        onscreenAlert("Error: " + e.name);
    else
        onscreenAlert("Error: " + e.message);
    console.error(e);
}

function togglePlainTextPreview(val) {
    if (val === undefined)
        plainTextPreview = !plainTextPreview;
    else
        plainTextPreview = val;
}

function uploadFile() {
    // Uses hidden HTML file upload button
    var fbutt = document.getElementById("file_upload");
    fbutt.onchange = function() {
        for (var i = 0; i < fbutt.files.length; i++) {
            writeFile(fbutt.files[i].name, fbutt.files[i], true);
        }
    };
    fbutt.click();
}

function createProd() {
    var name = "";
    while (name === "") {
        // Must also update in showmenu.js and filesystem.js
        
        if (document.hasFocus()) {
            name = prompt("Enter a name for the production:");
            if (name === null)
                return;
        }
    }
    
    filer.mkdir("/" + name, true, function() { 
        refreshFolder(); 
        window.open("live.html#" + name, "_blank"); 
        
    }, function(e) {
        if (e.name === "InvalidModificationError" || e.code === FileError.PATH_EXISTS_ERR) {
            onscreenAlert("\"" + name + "\" already exists.");
            return;
        } else if (e.code === FileError.QUOTA_EXCEEDED_ERR) {
            onscreenAlert("Cound not create production. Requesting more storage space...");
        } else {
            onError(e);
        }

    });
}

function openProd(i) {
    
    if (i < 0)
        return;

    var name;
    if (i.substring)
        name = i;
    else
        name = entries[i].name;
        
    window.open("live.html#" + name, "_blank");
    
}

function deleteProd(i, silent) {
    
    if (i < 0)
        return;

    var name;
    if (i.toFixed)
        name = entries[i].name;
    else if (i.substring)
        name = i;
    else
        name = i.name;
    
    if (!silent && !confirm("Delete production " + name + "? All files included in this production will also be deleted. This action cannot be undone!"))
        return;
    
    filer.rm(name, function() {
        refreshFolder();
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
        refreshFolder();
    }, onError);
}












function openFS() {
    try {
        filer.init({
                persistent: true,
                size: fs_cap
            }, function(fs) {
                console.log("Opened FileSystem: " + fs.name);

                // Load or create user configuration file
                cd("/", function(entries) {
                    loadUserConfig();

                    renderEntries(entries);
                    showUsage();
                });
                
            }, function(e) {
                if (e.name == "SECURITY_ERR") {
                    onscreenAlert("BROWSER_NOT_SUPPORTED");
                    throw new Error("BROWSER_NOT_SUPPORTED");
                }
                onError(e);
            });
    } catch (e) {
        if (e.code == FileError.BROWSER_NOT_SUPPORTED) {
            onscreenAlert("BROWSER_NOT_SUPPORTED");
        }
    }
}

function refreshFolder() {

    // Open the FS, otherwise list the files.
    if (filer && !filer.isOpen) {
        openFS();
    } else {
        filer.ls(".", function(entries) {
            renderEntries(entries);
        }, onError);
        showUsage();
    }
}

function constructEntryHTML(entry, i) {
    
    var tr = "<tr id=\"" + i + "\">" //onclick=\"select(" + i + ")\">";
    var img, name, open, download, show, remove;
    
    if (entry.isDirectory) {
        img = "<td><img src=\"images/folder.png\" class=\"icon\" onclick=\"cd(" + i + ")\" alt=\"[folder icon]\"></td>";
        name = "<td class=\"prod-name\"><a href=\"javascript:void(0);\" onclick=\"cd(" + i + ")\">" + entry.name + "</a></td>";
        open = "<td><a href=\"javascript:void(0);\" onclick=\"openProd(" + i + ")\">Launch Show</a></td>";
        download = "<td>Download (TODO)</td>";
        show = "<td></td>";
        remove = "<td><a href=\"javascript:void(0);\" onclick=\"deleteProd(" + i + ")\">Delete</a></td>";
    } else {
        img = "<td><img src=\"images/file.png\" class=\"icon\" onclick=\"readFile(" + i + ")\" alt=\"[file icon]\"></td>";
        name = "<td class=\"prod-name\"><a href=\"javascript:void(0);\" onclick=\"readFile(" + i + ")\">" + entry.name + "</a></td>";
        open = "<td><a href=\"javascript:void(0);\" onclick=\"readFile(" + i + ")\">Preview</a></td>";
        download = "<td><a href=\"" + entry.toURL() + "\" download>Download</a></td>"
        show = "<td></td>";
        remove = "<td><a href=\"javascript:void(0);\" onclick=\"removeFile(" + i + ")\">Delete</a></td>";
    }

    tr += img + name + open + download + show + remove + "</tr>";
    
    return tr;
}

function addEntryToList(entry, opt_idx) {
    var prodList = document.getElementById("production_list");

    // If an index isn't passed, we're creating a dir or adding a file. Append it.
    if (!opt_idx) {
        entries.push(entry);
    }

    var idx = (opt_idx === undefined) ? entries.length - 1 : opt_idx;

    prodList.innerHTML += constructEntryHTML(entry, idx);
}

function renderEntries(resultEntries) {
    var prodList = document.getElementById("production_list");
    var fmsg = document.getElementById("file_message");
    entries = resultEntries; // Cache the result set.

    prodList.innerHTML = ""; // Clear out existing entries and reset HTML.
    fmsg.innerHTML = "";

    if (!resultEntries.length) {
        fmsg.innerHTML = "[Empty directory]";
        return;
    }

    resultEntries.forEach(function(entry, i) {
        addEntryToList(entry, i);
    });
}


function showUsage() {
    filer.df(function(used, free, cap) {
        used = toMB(used);
        free = toMB(free);
        cap = toMB(cap);
        console.log("Filesystem used: " + used +
                    " MB\nFilesystem free: " + free +
                    " MB\nFilesystem capacity: " + cap + " MB");
        document.getElementById("fs_used").innerHTML = used + " MB";
        document.getElementById("fs_free").innerHTML = free + " MB";
        document.getElementById("fs_cap").innerHTML = cap + " MB";
    }, onError);
}

function toMB(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
}

function setCwd(path) {
    var elem = document.getElementById("cwd");
    var cwd = elem.value;
    var rootPath = filer.pathToFilesystemURL("/");

    if (path === "/" || (path === ".." && (rootPath === cwd))) {
        elem.value = filer.pathToFilesystemURL("/");
        return;
    } else if (path === "..") {
        var parts = cwd.split("/");
        parts.pop();
        path = parts.join("/");
        if (path === rootPath.substring(0, rootPath.length - 1)) {
            path += "/";
        }
    }

    elem.value = filer.pathToFilesystemURL(path);
}

function mkdir(name, opt_callback) {
    if (!name) 
        return;

    try {
        if (opt_callback) {
            filer.mkdir(name, false, opt_callback, onError);
        } else {
            filer.mkdir(name, true, addEntryToList, onError);
        }
    } catch (e) {
        onError(e);
    }
}

function cd(i, opt_callback) {

    if (i.substring) {
        var path = i;
    } else if (i == -1) {
        var path = "..";
    } else {
        var path = entries[i].fullPath;
    }

    setCwd(path);

    if (opt_callback) {
        filer.ls(path, opt_callback, onError);
    } else {
        filer.ls(path, renderEntries, onError);
    }
}

function openFile(i) {
    var fileWin = self.open(entries[i].toURL(), "fileWin");
}

function newFile(name) {
    if (!name) return;

    try {
        filer.create(name, true, addEntryToList, onError);
    } catch (e) {
        onError(e);
    }
}

function writeFile(filename, file, opt_rerender) {
    if (!file) 
        return;
    
    var rerender = false || opt_rerender;

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
            
            if (rerender) {
                addEntryToList(fileEntry);
                refreshFolder();
            }
        }, onError);
    }, function() {
        // File does not already exist
        filer.write(filename, { data: file, type: file.type }, function(fileEntry, fileWriter) {
            console.log("File " + filename + " was added to storage.");
            
            if (rerender) {
                addEntryToList(fileEntry);
                refreshFolder();
            }
        }, onError);
        
    })
    
    checkQuota();
}

function clearFS() {
    if (!confirm("Clear all files from FileSystem? This action cannot be undone!"))
        return;
    
    logFSContents();
    filer.ls(".", function(entries) { 
        for (var i = 0; i < entries.length; i++)
            removeFile(i, true);
    }, onError);
}

function logFSContents() {
    filer.ls(".", function(entries) { console.dir(entries); }, onError);
}

function checkQuota() {
    filer.df(function(used, free, cap) {
        console.log("fs used: " + used +
                    "\nfs free: " + free +
                    "\nfs capacity: " + cap);
        fs_cap = cap;
        fs_used = used;
        fs_free = free;
        if (used + 10 * 1024 * 1024 > cap) // If within 10 MB of quota
            increaseQuota(25); // Increase quota by 25 MB
    }, onError);
}

function increaseQuota(increaseAmtMB) {
    navigator.webkitPersistentStorage.requestQuota(fs_cap + increaseAmtMB * 1024 * 1024, function(grantedBytes) {
        console.log("FileSystem expanded to: " + grantedBytes / 1024 / 1024);
        fs_cap = grantedBytes;
    }, onError);
}

function renameFile(currPath, destDir, name) {

    filer.mv(currPath, destDir, name, function(entry) {
        console.log(currPath + ' renamed to ' + entry.name + ".");
        
        refreshFolder();
    });
}

function renameEntry(i, name) {

    filer.mv(entries[i].fullPath, ".", name, function(entry) {
        console.log(entries[i].name + ' renamed to ' + entry.name + ".");
        entries[i] = entry;

        refreshFolder();
    });
}

function removeFile(i, silent) {

    var entry = entries[i];
    console.dir(entries);

    if (!silent && !confirm("Delete " + entry.name + "? Productions that depend on this file will be affected.")) {
        return;
    }

    filer.rm(entry, function() {
        refreshFolder();
    }, onError);
}

function copy(el, i) {

    filer.cp(entries[i], el.textContent, function(entry) {
        console.log(entries[i].name + " renamed to " + entry.name + ".");
        onscreenInfo(entries[i].name + " renamed to " + entry.name + ".");
        entries[i] = entry;
    });
    
}

function readFile(i) {

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
                player.style.height = "67vh";
                player.src = entry.toURL();
                
                filePreview.appendChild(player);
                
                player.load();
                player.play();
                
            } else if (file.type.match(/text.*/) || file.type.match(/application\/pdf/) || file.type === "application/javascript") {
                var iframe = document.createElement("iframe");
                iframe.style.width = "98%";
                iframe.style.height = "63vh";
                
                // Display a full preview of the cue list file
                if (file.name.includes("_production.js")) {
                    
                    iframe.style.height = "60vh"; // Leave room for the toggle button
                    
                    // Plain text toggle
                    fileInfo.rows[3].innerHTML = "<td><button onclick=\"togglePlainTextPreview(); readFile(" + i + ")\">Toggle: HTML / Plain Text</button></td>";
                    //fileInfo.rows[3].innerHTML = "<td><input type=\"radio\" name=\"prev\" checked>HTML <input type=\"radio\" name=\"prev\">Plain Text"; // Needs onchange function
                    //fileInfo.rows[3].innerHTML = "<td><a href=\"javascript:void(0);\" onclick=\"togglePlainTextPreview(false); readFile(" + i + ")\">HTML</a> / <a href=\"javascript:void(0);\" onclick=\"togglePlainTextPreview(true); readFile(" + i + ")\">Plain Text</a></td>";
                    
                    // Cue list preview
                    var html = "<table id=\"cue_list\" class=\"cue-list\" style=\"top: 0; left: 0;\">";
                    var css = "<link href=\"css/style.css\" rel=\"stylesheet\" type=\"text/css\">"
                    var script = document.createElement("script");
                    script.onload = function() {
                        if (!plainTextPreview) {
                            html += prodData.cueListContent;
                            html += "</table>";
                            iframe.onload = function() {
                                iframe.contentWindow.document.head.innerHTML = css;
                                iframe.contentWindow.document.body.innerHTML = html;
                            }
                            filePreview.appendChild(iframe);
                        } else {
                            var textarea = document.createElement("textarea");
                            textarea.style.width = "98%";
                            textarea.style.height = "60vh";
                            textarea.textContent = JSON.stringify(prodData);
                            filePreview.appendChild(textarea);
                        }
                    }
                    
                    // Point script to production file and append
                    script.src = filer.pathToFilesystemURL(entry.name);
                    document.body.appendChild(script);
                
                // Handle other text based files    
                } else {
                    iframe.src = entry.toURL();
                    iframe.onload = function() {
                        iframe.contentWindow.document.body.style.backgroundColor = "white";
                    }
                    filePreview.appendChild(iframe);
                }

            } else if (file.type.match(/image.*/)) {

                var img = new Image();
                img.className = "hidden";
                img.onload = function() {
                    // TODO: implement fade in
                    img.className = "";
                }
                img.style.height = "67vh";
                img.src = entry.toURL();

                filePreview.appendChild(img);

            } else if (PREVIEWABLE_FILES.indexOf(Util.getFileExtension(file.name)) != -1) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var textarea = document.createElement("textarea");
                    textarea.style.width = "98%";
                    textarea.style.height = "67vh";
                    textarea.textContent = e.target.result;
                    filePreview.appendChild(textarea);
                };
                reader.readAsText(file);
            } else {
                console.log("No preview available -- file type: " + file.type + ", extension: " + Util.getFileExtension(file.name));
                var p = document.createElement("p");
                p.textContent = "No preview available."
                filePreview.appendChild(p);
            }

        }, onError);
    } catch (e) {
        onError(e);
    }
}

function togglePreview(visible) {
    if (!visible)
        filePreviewCont.className = filePreviewCont.className.replace("visible", "hidden");
    else
        filePreviewCont.className = filePreviewCont.className.replace("hidden", "visible");
    filePreview.innerHTML = "";
}

function onKeydown(e) {
    var target = e.target;

    if (e.keyCode == 27) { // ESC
        togglePreview(false);

        e.preventDefault();
        e.stopPropagation();
        return;
    }
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
                        refreshFolder(); // Rerender view on final file.
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
        el_.classList.remove("dropping");
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
    document.addEventListener("keydown", onKeydown, false);

    var dnd = new DnDFileController("body", function(files, e) {
        var items = e.dataTransfer.items;
        for (var i = 0, item; item = items[i]; ++i) {
            filer.cp(item.webkitGetAsEntry(), filer.cwd, null, function(entry) {
                addEntryToList(entry);
            });
        }
    });
}

window.addEventListener("DOMContentLoaded", function(e) {
    addListeners();
}, false);