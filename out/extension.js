"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
// 引入api
const blog_1 = require("./test/blog/blog");
const vscode_1 = require("vscode");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "xblog" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    // 发布文章
    let publishMd = vscode_1.commands.registerCommand('extension.publishBlog', function () {
        // 验证
        if (!validate()) {
            return;
        }
        new blog_1.xblog().publicAritle();
    });
    context.subscriptions.push(publishMd);
    //复制截屏
    let copyImg = vscode.commands.registerCommand('extension.copyImg', () => {
        // 验证
        if (!validate()) {
            return;
        }
        new blog_1.xblog().copyImg();
    });
    context.subscriptions.push(copyImg);
    // 上传图片
    let uploadImg = vscode_1.commands.registerCommand('extension.uploadImg', function () {
        // 验证
        if (!validate()) {
            return;
        }
        // @ts-ignore
        vscode_1.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'Images': ['png', 'jpeg', 'jpg', 'gif', 'bmp']
            }
        }).then(uri => {
            if (uri) {
                new blog_1.xblog().uploadImg(uri[0].fsPath);
            }
        });
    });
    context.subscriptions.push(uploadImg);
    /**
     * 数据验证
     */
    function validate() {
        let config = vscode_1.workspace.getConfiguration('xblog');
        if (!config.enable) {
            vscode_1.window.showWarningMessage("插件未启用");
            return false;
        }
        if (!vscode_1.window.activeTextEditor) {
            vscode_1.window.showWarningMessage("未打开编辑器");
            return false;
        }
        if ("markdown" !== vscode_1.window.activeTextEditor.document.languageId) {
            vscode_1.window.showWarningMessage("不支持的文档类型");
            return false;
        }
        return true;
    }
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map