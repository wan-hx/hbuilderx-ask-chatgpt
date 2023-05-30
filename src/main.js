const hx = require("hbuilderx");

const fs = require("fs");
const path = require("path");

const { GPTTokens } = require('gpt-tokens')

const axios = require('axios');

const chatgpt_actions_create = require("./chatgpt_actions/chatgpt_actions_create.js")
const chatgpt_actions_list_open = require("./chatgpt_actions/chatgpt_actions_list_open.js")
const chatgpt_coding = require("./chatgpt_coding/chatgpt_coding.js");
const chatgpt_webview = require("./chatgpt_webview/chatgpt_webview.js");

const chatGPTImageGenerations = require('./chatgpt_images/openImageWindows.js');
const {
    showPluginSettings,
    chatGPTModelList
} = require('./setting/settings.js');

const tokenizer = require('./token/tokenizer.js');

const {
    getHBuilderXConfig,
    checkPluginVersion,
    createConsoleWindow,
    print_log
} = require("./libs/utils.js");

global.rawHistoryMsgList = [];

// openAIkey
global.openAIProxyURL = "https://api.openai.com/v1";
global.openAIApiKey = "";
global.global_chatgpt_model = "gpt-3.5-turbo";

// 上下文消息数量
global.global_chatgpt_context_length = 4;

// 插件数据存储目录
global.appDataDir = path.join(hx.env.appData, "Ask-chatGPT");
if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir);
};

// 自定义actions文件
global.actionsFile = path.join(appDataDir, ".actions.json");

// 当前chatGPT的聊天名称, 默认为message
global.sessionFile = path.join(appDataDir, ".session.json");
global.current_chat_session_name = "message";

// 对话状态，是否在对话中。新增 会话状态 会话不结束，禁止创建新会话和切换会话
global.isChatting = false;

// 是否初始化
let isBeenInitialized = false;

// 使用的token数量
let todayUseTokens = 0;

// 正则匹配let a = "https://xxx.xx.com/v1", 以https://开头，以/v1结尾
const regProxyURL = /^https:\/\/.*\/v1$/;


// 监听配置项变化
hx.workspace.onDidChangeConfiguration(function(event){
    if(event.affectsConfiguration("askChatGPT.configurationMethod") || event.affectsConfiguration("askChatGPT.proxyURL") || event.affectsConfiguration("askChatGPT.apiKey")) {
        console.error("配置项发生变化，重新初始化插件......")
        initRunConfig();
    };

    if(event.affectsConfiguration("askChatGPT.ChatGPTModel")){
        let read_chatgpt_model = hx.workspace.getConfiguration("askChatGPT").get("ChatGPTModel");
        if (chatGPTModelList.includes(read_chatgpt_model)) {
            global_chatgpt_model = read_chatgpt_model;
        };
    };
    if(event.affectsConfiguration("askChatGPT.NumberOfAttachedHistoryMessages")){
        let read_chatgpt_context_length = hx.workspace.getConfiguration("askChatGPT").get("NumberOfAttachedHistoryMessages");
        if (/^[0-9]$|^10$/.test(read_chatgpt_context_length)) {
            global_chatgpt_context_length = read_chatgpt_context_length;
        };
    };
});


/**
 * @description show chatGPT setting
 * @param {Boolean} isLog
 * @returns
 */
async function open_chatGPT_setting_in_HBuilderX(isLog = true) {
    // 控制台输出提示
    if (isLog) {
        createConsoleWindow("【提示】请配置openAI API key和ChatGPT server URL后再使用。如果已输入，请检查配置是否正确。", "warning")
        createConsoleWindow("【提示】如果想使用插件内置的ChatGPT配置，请在插件Ask-ChatGPT设置窗口进行设置。", "warning")
    };
    await showPluginSettings();
};


/**
 * @description 发送问题
 * @param {Object} question
 *  * @param {Object} webView
 */
async function chatGPT_send_question(question) {
    print_log("log", "[ChatGPT]请求.... openAIApiKey openAIProxyURL = ", openAIApiKey, openAIProxyURL);

    let targetURL = `${openAIProxyURL}/chat/completions`;
    let chatGPT_messages = [];

    // 附带的消息数量
    let default_number = 0;
    if (default_number == 0) {
        chatGPT_messages = [{"role": "user","content": question}]
    } else {
        chatGPT_messages = rawHistoryMsgList.length <= default_number
            ? rawHistoryMsgList
            : rawHistoryMsgList.slice(Math.max(rawHistoryMsgList.length - default_number - 1, 0));

        chatGPT_messages = chatGPT_messages.map(item => {
            return { role: item.role, content: item.content }
        });
    };

    hx.window.setStatusBarMessage("提示：正在从ChatGPT获取答案......")

    try {
        let reqData = {
            model: global_chatgpt_model,
            messages: chatGPT_messages,
            // stream: true
        };

        reqData["max_tokens"] = 4000;

        print_log("log", "[日志] 附带的消息数量:", default_number);
        print_log("log", "[日志] todayUseTokens .......", todayUseTokens);
        print_log("log", "[日志] 当前请求内容 .......", targetURL, openAIApiKey, reqData);
        if (targetURL.includes("//api.openai.com")) {
            hx.window.setStatusBarMessage("Ask-ChatGPT: 当前访问的URL是openAI官方的地址，国内可能无法访问，请先确认可以正常访问https://api.openai.com", 2000, "warn");
        };

        const completion = await axios({
            method: 'post',
            url: targetURL,
            data: reqData,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAIApiKey}`
            }
        }).catch(function (error) {
            // let status = error.response.status;
            return error.response.data;
        });
        // print_log("log", "[日志]chatGPT完整响应：", completion);

        if (typeof completion == "string") {
            createConsoleWindow(`【错误】请求出错，错误消息：${completion}`, "error");
            return;
        };

        if (completion.error) {
            let errorMsg = completion.error.message;
            let lastErrorMsg = JSON.stringify(completion.error);
            if (global_chatgpt_model.includes("gpt-4") && errorMsg.includes("gpt-4")) {
                lastErrorMsg = lastErrorMsg + "\n。您设置了gpt-4模型，但是该模型需要付费才能使用。请确认你的chatGPT账号是否支持。";
            };
            if (errorMsg.includes("maximum context length is")) {
                lastErrorMsg = lastErrorMsg + "\n尝试方法：上下文长度超过了chatGPT允许的最大长度，请在插件设置中，调整附带历史消息数量，比如调整为1或0."
            };
            createConsoleWindow(`【错误】请求出错，错误消息：${lastErrorMsg}`, "error");
            return;
        };

        let chatGPT_result = completion.data.choices[0].message;
        print_log("log", "[日志]chatGPT响应：", chatGPT_result);

        // 记录消耗的toaken
        try {
            let usageToken = completion.data.usage.total_tokens;
        } catch (error) {};

        hx.window.clearStatusBarMessage();
        return chatGPT_result;
    } catch (error) {
        console.log("[程序异常]", JSON.stringify(error));
        let lastErrorMsg = "插件出错了，如在插件配置中自定义过api key和代理地址，请检查是否正确。如无法解决，可联系插件作者。";
        if (targetURL.includes("//api.openai.com")) {
            lastErrorMsg = lastErrorMsg + "请求失败或请求错误。当前请求的URL是openAI官方的地址，国内可能无法访问，请先确认可以正常访问https://api.openai.com。或点击菜单【工具 - Ask ChatGPT】设置，设置代理地址。";
        };
        hx.window.showErrorMessage(`Ask-chatGPT: 插件执行错误。 如果你自定义过插件设置，请确保设置项有效!`, ["我知道了"]);
    };
};

/**
 * @description 初始化插件, 只要插件版本检查正确，一律返回true
 * @returns {Boolean}
 */
async function initChatGPTPlugin() {
    print_log("log", "[初始化]插件设置.......");

    // 配置项方式
    let configurationMethod = await getHBuilderXConfig("askChatGPT.configurationMethod");
    
    // 配置项：读取自定义设置proxy
    let user_custom_ChatGPT_server_url = await getHBuilderXConfig("askChatGPT.proxyURL");

    let user_custom_openai_api_key = await getHBuilderXConfig("askChatGPT.apiKey");
    if (user_custom_openai_api_key && user_custom_openai_api_key.trim() != "") {
        openAIApiKey = user_custom_openai_api_key;
    } else {
        createConsoleWindow("Ask-chatGPT: 插件设置，chatGPT api key 不正确。请点击菜单【工具 - Ask ChatGPT - 设置】重新配置。", "error");
        return false;
    };

    if (!regProxyURL.test(user_custom_ChatGPT_server_url)) {
        createConsoleWindow("Ask-chatGPT: 插件设置，chatGPT api访问地址或代理地址格式不正确。请点击菜单【工具 - Ask ChatGPT - 设置】重新配置。", "error");
        return false;
    } else {
        openAIProxyURL = user_custom_ChatGPT_server_url;
    };

    // 配置项：模型设置
    let user_custom_chatGPT_model = await getHBuilderXConfig("askChatGPT.ChatGPTModel");
    if (user_custom_chatGPT_model && user_custom_chatGPT_model.trim() != "") {
        global_chatgpt_model = user_custom_chatGPT_model;
    };

    // 配置项：上下文消息数量
    let user_custom_chatGPT_context_length = await getHBuilderXConfig("askChatGPT.NumberOfAttachedHistoryMessages");
    if (/^[0-9]$|^10$/.test(user_custom_chatGPT_context_length)) {
        global_chatgpt_context_length = user_custom_chatGPT_context_length;
    };

    print_log("info", "[日志]用户自定义消息上下文设置.......", user_custom_chatGPT_context_length, global_chatgpt_context_length);
    print_log("error", "[日志]最终chatGPT访问配置.......", openAIApiKey, openAIProxyURL, global_chatgpt_context_length, global_chatgpt_model);

    let lastChatSessionName = await getHBuilderXConfig("askChatGPT.lastChatSessionName");
    if (fs.existsSync(sessionFile) && lastChatSessionName) {
        if (lastChatSessionName.trim() == "") return true;
        try {
            sessionFileContent = fs.readFileSync(sessionFile, "utf-8");
            sessionFileContent = JSON.parse(sessionFileContent);
            let sessionList = sessionFileContent.map(item => {
                return item["sessionName"];
            });
            if (sessionList.includes(lastChatSessionName)) {
                current_chat_session_name = lastChatSessionName;
            };
        } catch (error) {};
    };
    isBeenInitialized = true;
    return true;
};


/**
 * @description 插件主入口
 * @param {string} name
 * @param {Object} webView
 * @returns
 */
async function runCommand(commandName, webView, AssignName) {
    if (!["setting", "create_actions", "tokenizer"].includes(commandName) && !isBeenInitialized) {
        let initResult = await initChatGPTPlugin();
        if (!initResult) {
            hx.window.showInformationMessage("Ask-chatGPT: 插件初始化失败，请重装插件或联系作者。", ["我知道了"]);
            return;
        };
    };

    print_log("[请求]", openAIApiKey, openAIProxyURL, global_chatgpt_context_length, global_chatgpt_model);

    // 检查插件版本
    setTimeout(() => {
        checkPluginVersion();
    }, 5000);

    switch (commandName) {
        case "GPTWebView":
            chatgpt_webview(webView, chatGPT_send_question);
            break;
        case "coding":
            chatgpt_coding(chatGPT_send_question);
            break;
        case "setting":
            open_chatGPT_setting_in_HBuilderX(false);
            break;
        case "create_actions":
            chatgpt_actions_create(actionsFile);
            break;
        case "open_actions":
            chatgpt_actions_list_open(actionsFile, chatGPT_send_question, AssignName);
            break;
        case "images_generations":
            chatGPTImageGenerations();
            break;
        case "tokenizer":
            tokenizer();
            break;
        default:
            hx.window.showErrorMessage("Ask-ChatGPT: 没有找到对应的命令。", ["我知道了"]);
    };
};

module.exports = runCommand;
