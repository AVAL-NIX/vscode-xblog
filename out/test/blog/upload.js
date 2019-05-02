"use strict";
const vscode = require("vscode");
const request = require("request");
const fs = require("fs");
const util = require("util");
const IMG = "![%s](%s \"%s\")";
class Upload {
    /**
     *  上传图片
     * @param {string} localPath  图片本地路径
     */
    uploadImage(localPath) {
        let config = vscode.workspace.getConfiguration('xblog');
        let api = config.api;
        if (api === null || api === "") {
            api = api.default;
        }
        request.post({
            url: api + config.uploadImageUri,
            headers: {
                "accessToken": config.accessToken
            },
            formData: {
                "multipartFile": fs.createReadStream(localPath)
            }
        }, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                let data = eval('(' + body + ')');
                if (data.code < 1) {
                    vscode.window.showWarningMessage(data.msg);
                    return;
                }
                // var result = data.payload;
                // let img = formatImg(result.title, result.url);
                let editor = vscode.window.activeTextEditor;
                editor.edit((editBuilder) => {
                    editBuilder.insert(editor.selection.active, data.msg);
                });
            }
        });
    }
}
exports.Upload = Upload;
function formatImg(title, url) {
    return util.format(IMG, title, url, title);
}
//# sourceMappingURL=upload.js.map