// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// 引入api
import { xblog } from "./test/blog/blog";
import { config } from 'process';
import { workspace, window, commands } from 'vscode';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "xblog" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json

    // 发布文章
    let publishArticle = commands.registerCommand('extension.publishBlog', function () {
        // 验证
        if (!validate()) {
            return;
        }
        new xblog().publicAritle();
    });
    context.subscriptions.push(publishArticle);

    // 搜索文章
    let searchArticle = commands.registerCommand('extension.searchBlog', function () {
        // 验证
        if (!validate()) {
            return;
        }
        window.showInputBox({
            placeHolder: "输入文档标题搜索"
        }).then(function (title) {
            if (title === undefined || title.length <= 0) {
                window.showWarningMessage("请输入内容!");
                return;
            }
            let data: any = {
                "title": title
            };
            if (data !== null) {
                new xblog().searchAritle(data);
            }
        });
    });
    context.subscriptions.push(searchArticle);

    //复制截屏
    let copyImg = vscode.commands.registerCommand('extension.copyImg', () => {
        // 验证
        if (!validate()) {
            return;
        }
        new xblog().copyImg();
    });
    context.subscriptions.push(copyImg);

    // 上传图片
    let uploadImg = commands.registerCommand('extension.uploadImg', function () {
        // 验证
        if (!validate()) {
            return;
        }
        // @ts-ignore
        window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'Images': ['png', 'jpeg', 'jpg', 'gif', 'bmp']
            }
        }).then(uri => {
            if (uri) {
                new xblog().uploadImg(uri[0].fsPath);
            }
        });

    });
    context.subscriptions.push(uploadImg);

	/**
	 * 数据验证
	 */
    function validate(): boolean {
        let config = workspace.getConfiguration('xblog');
        if (!config.enable) {
            window.showWarningMessage("插件未启用");
            return false;
        }
        if (!window.activeTextEditor) {
            window.showWarningMessage("未打开编辑器");
            return false;
        }
        if ("markdown" !== window.activeTextEditor.document.languageId) {
            window.showWarningMessage("不支持的文档类型");
            return false;
        }
        return true;
    }



}
// this method is called when your extension is deactivated
export function deactivate() { }
