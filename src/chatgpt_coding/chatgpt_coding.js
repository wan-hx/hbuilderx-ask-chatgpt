const hx = require("hbuilderx");

const {
    getEditorSelectionText,
    createConsoleWindow,
    supportLanguageList,
    stripQuotes
} = require("../libs/utils.js");

/**
 * @description 使用正则匹配
 * @param {String} str
 * @returns
 */
async function getCodeContent(str) {
    const regex = /^\`{3}[a-zA-Z1-9+#]*\n([\s\S]+?)\n`{3}/;
    const match = str.match(regex);
    return match ? match[1] : str;
};


/**
 * @description chatGPT结果写入文件
 * @param {String} filename 
 * @param {String} answer_content 
 */
async function write_chatgpt_result_to_file(filename, answer_content) {
    await hx.window.clearStatusBarMessage();
    await hx.commands.executeCommand("editor.action.insertLineAfter");

    await hx.window.getActiveTextEditor().then(function(editor) {
        let currentFilename = editor.document.fileName;
        if (currentFilename != filename) {
            hx.env.clipboard.writeText(answer_content);
            hx.window.setStatusBarMessage("ASK-ChatGPT: 当前文件名与提问时的文件名不一致，已将答案写入到剪切板", 5000, 'error');
            return;
        };
        let selection = editor.selection;
        editor.edit(editBuilder => {
            editBuilder.replace(selection, answer_content);
        });
    });
};


/**
 * @description coding
 */
async function chatgpt_coding(chatGPT_send_question) {
    let content = await getEditorSelectionText();
    let { filename, language, selectionText, projectType } = content;
    // console.error(supportLanguageList, language);
    if (!supportLanguageList.includes(language.toLowerCase())) {
        hx.window.showInformationMessage("Ask-chatGPT: 不支持当前文件，请切换到支持的文件，比如js、css、Python等。", ["我知道了"]);
        return;
    };
    if (selectionText == undefined || selectionText.length <= 2) {
        createConsoleWindow("【提示】请在编辑器中，选中内容后再操作（至少选中2个字符）。", "warning");
        createConsoleWindow("【提示】比如：js文件，输入内容：定义一个方法，正则匹配email。光标选中内容，点击菜单【Coding ChatGPT】", "warning");
        return;
    };

    let Question = `你是${language}开发程序员。后面我将给出问题，我希望你只在一个唯一的代码块内回复输出，而不是其它任何内容。不要写解释。问题: ${selectionText}`;
    if (projectType == "uniapp") {
        Question = `你是${language}开发程序员。后面我将给出问题，我希望你只在一个唯一的代码块内回复输出，而不是其它任何内容。不要写解释。问题: ${projectType}项目，${selectionText}`;
    };

    let result = await chatGPT_send_question(Question);
    if (result == "" || result == undefined) return;

    if (typeof result != 'object') {
        hx.window.setStatusBarMessage("Ask-chatGPT: 没有获取到答案，请重试哟!", 5000, "error");
        return;
    };

    let answer_content = result.content;
    if (answer_content == undefined || answer_content.trim() == "") {
        hx.window.setStatusBarMessage("Ask-chatGPT: 没有获取到答案，请重试!", 5000, "error");
        return;
    };

    answer_content = await getCodeContent(answer_content);
    answer_content = stripQuotes(answer_content);
    await write_chatgpt_result_to_file(filename, answer_content);
};

module.exports = chatgpt_coding;