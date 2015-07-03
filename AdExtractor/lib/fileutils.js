var {Cc, Ci} = require("chrome");

//文件选择对话框
function promptForFile() {
    var window = require("sdk/window/utils").getMostRecentBrowserWindow();
    const nsIFilePicker = Ci.nsIFilePicker;

    var fp = Cc["@mozilla.org/filepicker;1"]
           .createInstance(nsIFilePicker);
    fp.init(window, "选择url列表文件", nsIFilePicker.modeOpen);
    fp.appendFilter("*.txt", "*.txt");
    fp.appendFilter("*.*", "*.*");

    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
        var file = fp.file;
        var path = fp.file.path;
    }
    return path;
}

//读取文件内容
function readTextFile(filename) {
    var fileIO = require("sdk/io/file");
    var text = '';
    if (fileIO.exists(filename)) {
        var TextReader = fileIO.open(filename, "r");
        if (!TextReader.closed) {
            text = TextReader.read();
            TextReader.close();
        }
    }
    return text;
}

exports.promptForFile = promptForFile;
exports.readTextFile = readTextFile;
