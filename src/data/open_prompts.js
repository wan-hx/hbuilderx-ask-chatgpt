const hx = require('hbuilderx');

let data = require('./prompts.json');

async function getOpenPrompts(webView="", isCopy=false) {
    let placeHolder = isCopy ? "请选择提示词, 点击后将拷贝到剪切板..." : '请选择提示词';
    let result = await hx.window.showQuickPick(data, { placeHolder: placeHolder }).then(function (result) {
        if (!result) {
            return;
        };
        return result.description;
    });

    if (result != "" && result != undefined && webView != "") {
        webView.postMessage({
            command: "prompt",
            content: result
        });
    };

    // 复制到剪贴板
    if (isCopy) {
        hx.env.clipboard.writeText(result);
        hx.window.setStatusBarMessage("已将提示词复制到剪切板", 5000, "info");
    };
};

module.exports = getOpenPrompts;
