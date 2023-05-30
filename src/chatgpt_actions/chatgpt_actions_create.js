const hx = require("hbuilderx");
const fs = require("fs");
const createActionsFormDialog = require("./createActionsFormDialog.js");

/**
 * @description 创建ChatGPT的actions
 */
async function createChatGPTActions(actionsFile) {
    let fill_info = await createActionsFormDialog();
    if (fill_info == undefined) return;
    if (typeof fill_info != 'object') {
        hx.window.showErrorMessage("解析填写的信息失败，请重试。或联系管理员！", ["我知道了"]);
        return;
    };
    // nodejs 判断路径是否存在
    if (!fs.existsSync(actionsFile)) {
        fs.writeFileSync(actionsFile, JSON.stringify([fill_info]));
        return;
    };
    try {
        let file_data = fs.readFileSync(actionsFile, "utf-8");
        file_data.push(fill_info);
        fs.writeFileSync(actionsFile, JSON.stringify(file_data));
        hx.window.setStatusBarMessage("Ask-chatGPT: 保存action到本地文件成功。", 5000, "info");
    } catch (error) {
        hx.window.showErrorMessage("AskChatGPT: 保存action到本地文件失败。", ["我知道了"]);
    };
};

module.exports = createChatGPTActions;
