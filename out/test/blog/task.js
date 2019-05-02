"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
//  获取MD元数据插件
const fm = require("front-matter");
class xblog {
    constructor() { this.validateConfig(); }
    // 配置验证
    validateConfig() {
        // 配置属性
        let config = vscode_1.workspace.getConfiguration('xblog');
        if (!config.enable) {
            vscode_1.window.showWarningMessage("xblog 已禁用");
            return false;
        }
        if (config.accessToken == null || config.accessToken == "") {
            vscode_1.window.showWarningMessage("授权访问凭证未配置");
            return false;
        }
        return true;
    }
    // 数据验证
    validateData() {
        // 获取内容
        let text = vscode_1.window.activeTextEditor.document.getText();
        // 解析元数据
        let result = fm(text);
        let sign = result.attributes.sign;
        let title = result.attributes.title;
        let tags = result.attributes.tags;
        let channel = result.attributes.channel;
        let content = result.body;
        if ((sign == null || sign == "")) {
            vscode_1.window.showWarningMessage("元数据[签名]丢失，请重新获取数据");
            return null;
        }
        if (title == null || title == "") {
            vscode_1.window.showWarningMessage("请填写元数据[标题]");
            return null;
        }
        if (channel == null || channel == "") {
            vscode_1.window.showWarningMessage("请填写元数据[频道]");
            return null;
        }
        if (content == null || content == "") {
            vscode_1.window.showWarningMessage("请填写文档内容");
            return null;
        }
        var data = {
            "sign": sign,
            "title": title,
            "channel": channel,
            "tags": tags,
            "content": content
        };
        return data;
    }
    publicAritle(body) {
        let text = vscode_1.window.activeTextEditor.document.lineAt(1).text;
        vscode_1.window.activeTextEditor.edit(editBuilder => {
            if (text.startsWith("sign")) {
                editBuilder.replace(new vscode_1.Range(new vscode_1.Position(1, 0), new vscode_1.Position(1, text.length)), "sign: " + body.msg);
            }
            else {
                editBuilder.insert(new vscode_1.Position(1, 0), "sign: " + body.msg + "\n");
            }
        });
        vscode_1.window.showInformationMessage(body.msg);
    }
    updateAritle() {
    }
    uploadImg(filePath) {
    }
    delAritle() {
    }
}
function genMetaHeader(sign, title, channel, tags) {
    return util.format(METADATA_HEADER, sign, channel, title, tags);
}
class R {
    constructor(code, msg) {
        this.code = code;
        this.msg = msg;
    }
}
//# sourceMappingURL=task.js.map