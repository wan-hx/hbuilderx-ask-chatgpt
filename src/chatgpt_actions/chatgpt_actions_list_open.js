const hx = require("hbuilderx");
const fs = require("fs");
const path = require("path");

const {
    getEditorSelectionText,
    HBuilderXEditorHandle,
    createConsoleWindow,
} = require("../libs/utils.js");

/**
 * @description 打开action列表
 * @param {string} actionsFile actions文件路径
 * @param {function} chatGPT_send_question 请求chatGPT的函数
 * @param {string} AssignName 指定的action名称. 用于一些重要的actions暴漏到菜单，通过菜单触发调用.
 */
async function chatgpt_actions_list_open(actionsFile, chatGPT_send_question, AssignName) {
    let data = [];
    try {
        const builtln_file_data = require("./builtln_actions_data.json");
        data = [...builtln_file_data];
    } catch (error) {
        console.log("error", error)
        hx.window.showErrorMessage("获取Actions列表失败,", ["我知道了"]);
        return;
    };

    let chat_action, hx_action;

    // 一些重要的actions暴漏到菜单，通过菜单触发调用
    if (["fixBug", "explainCode", "GenerateTestCases", "GenerateTestCasesUsingJest"].includes(AssignName)) {
        let findActionsData = data.find(item => item.id == AssignName);
        if (findActionsData == undefined || findActionsData.length == 0) return;
        chat_action = findActionsData.chat_action;
        hx_action = findActionsData.hx_action;
    } else {
        try {
            if (fs.existsSync(actionsFile)) {
                const user_file_data = require(actionsFile);
                if (typeof user_file_data == 'object') {
                    data = data.concat(user_file_data);
                };
            };
        } catch (error) {
            hx.window.setStatusBarMessage("AskChatGPT: 获取自定义action数据失败....", 2000, "error");
        };

        let selectedResult = await hx.window.showQuickPick(data, { placeHolder: "请选择action..." }).then(function (result) {
            if (!result) {
                return;
            };
            return result;
        });

        if (selectedResult == undefined) return;
        chat_action = selectedResult.chat_action;
        hx_action = selectedResult.hx_action;
    };

    // 获取编辑器选中的内容
    let editorContent = await getEditorSelectionText();
    let {filename, selectionText} = editorContent;

    if (selectionText == undefined || selectionText.trim() == 0) {
        let msg = "Ask-ChatGPT: 请在编辑器选中文本后再试";
        if (["fixBug", "explainCode", "GenerateTestCases"].includes(AssignName)) {
            msg = "Ask-ChatGPT: 请选中一段代码再进行操作。";
        };
        hx.window.showErrorMessage(msg, ["我知道了"]);
        return;
    };

    // 请求chatGPT
    let question = chat_action.replace("${selected}", selectionText);
    let chatGPTResult = await chatGPT_send_question(question);
    let assistantResult;
    try{
        assistantResult = chatGPTResult.content;
        if (assistantResult == undefined) {
            return;
        };
    }catch(e){
        hx.window.setStatusBarMessage("AskChatGPT: 从ChatGPT获取结果失败！", 5000, "error");
        return;
    };
    switch (hx_action) {
        case "replace":
            HBuilderXEditorHandle(filename, assistantResult, "replace");
            break;
        case "insert_the_cursor":
            HBuilderXEditorHandle(filename, assistantResult, "insert_the_cursor");
            break;
        case "insert_on_next_line":
            HBuilderXEditorHandle(filename, assistantResult, "insert_on_next_line");
            break;
        default:
            createConsoleWindow(`👉问：${question}`);
            createConsoleWindow(`👉答：\n\n${assistantResult}`);
    };
};

module.exports = chatgpt_actions_list_open;
