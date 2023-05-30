const hx = require("hbuilderx");
const fs = require("fs");
const path = require("path");

const axios = require('axios');
const marked = require("marked");

const getWebviewContent = require('./html.js');
const getThemeColor = require('./theme.js');
const getOpenPrompts = require('../data/open_prompts.js');
const createChatNameFormDialog = require('../chat/createChat.js');

const {
    updateHBuilderXConfig,
    print_log,
    getCurrentTime
} = require("../libs/utils.js");

class ChatGPT_Session {
    constructor(webView) {
        this.webView = webView;
        this.historyMsgList = [];
        this.chat_session_file_path = path.join(appDataDir, `${current_chat_session_name}.json`);
    };

    /**
     * @description 获取聊天会话列表
     */
    async getSessionList() {
        if (isChatting) {
            hx.window.showInformationMessage("Ask-chatGPT: 当前聊天会话正在进行中，正在等待服务器结果..., 请结束后再操作。", ["我知道了"]);
            return;
        };
        let sessionList = [
            { "label": "Ask ChatGPT", "sessionName": "message", "description": "默认聊天" }
        ];
        try {
            let sessionFileContent = [];
            if (fs.existsSync(sessionFile)) {
                sessionFileContent = fs.readFileSync(sessionFile, "utf-8");
                sessionFileContent = JSON.parse(sessionFileContent);
                sessionList = [...sessionList, ...sessionFileContent];
            };
            let result = await hx.window.showQuickPick(sessionList, { placeHolder: '请选择聊天会话' }).then(function (result) {
                if (!result) {
                    return;
                };
                return result;
            });
            if (result == undefined) return;
            let { label, sessionName } = result;
            if (current_chat_session_name == sessionName) return;

            // 修改全局变量
            current_chat_session_name = sessionName;

            // 保存到配置项
            updateHBuilderXConfig("askChatGPT", "lastChatSessionName", current_chat_session_name);

            await hx.commands.executeCommand("askChatGPT.main");
        } catch (error) {
            console.log(error);
            hx.window.showInformationMessage("Ask-chatGPT: 读取chatGPT会话列表失败", ["我知道了"]);
        }
    };

    /**
     * @description 读取本地消息文件，获取历史消息
     */
    async getSessionMsgList() {
        try {
            this.historyMsgList = [];
            rawHistoryMsgList = [];
            
            if (!fs.existsSync(this.chat_session_file_path)) {
                this.webView.postMessage({
                    command: "historyMsg",
                    content: []
                });
                return;
            };
            rawHistoryMsgList = fs.readFileSync(this.chat_session_file_path, "utf-8");
            rawHistoryMsgList = JSON.parse(rawHistoryMsgList);
            if (rawHistoryMsgList.length != 0) {
                for (let item of rawHistoryMsgList.slice(-20)) {
                    let s = JSON.parse(JSON.stringify(item));
                    s["RawContent"] = s.content;
                    s["content"] =  marked.parse(s.content);
                    this.historyMsgList.push(s);
                };
            };

            this.webView.postMessage({
                command: "historyMsg",
                totalMsg: rawHistoryMsgList.length,
                defaultShowMsg: 20,
                content: this.historyMsgList
            });
        } catch (e) {
            hx.window.setStatusBarMessage("Ask-chatGPT: 读取chatGPT历史消息失败", 5000, "error");
        };
    };

    /**
     * @description 将session名字.session.json文件
     */
    async saveSessionNameToFile(newSessionName) {
        let sessionList = [];
        try {
            if (fs.existsSync(sessionFile)) {
                let sessionFileContent = fs.readFileSync(sessionFile, "utf-8");
                sessionList = JSON.parse(sessionFileContent);
            }
        } catch (error) { };

        try {
            sessionList.push({ "label": newSessionName, "sessionName": newSessionName });
            fs.writeFileSync(sessionFile, JSON.stringify(sessionList), { encoding: 'utf-8' });
        } catch (error) { }
    };

    /**
     * @description 创建新的聊天会话
     */
    async createNewSession() {
        if (isChatting) {
            hx.window.showInformationMessage("Ask-chatGPT: 当前聊天会话正在进行中，正在等待服务器结果..., 请结束后再操作。", ["我知道了"]);
            return;
        };
        let newSessionName = await createChatNameFormDialog(appDataDir);
        if (newSessionName) {
            this.webView.postMessage({
                command: "createSession",
                content: newSessionName
            });
            current_chat_session_name = newSessionName;
            // 保存刚创建的聊天会话名称到HBuilderX配置项
            await updateHBuilderXConfig("askChatGPT", "lastChatSessionName", newSessionName);
            // 保存到本地文件
            await this.saveSessionNameToFile(newSessionName);
            hx.commands.executeCommand("askChatGPT.main");
        };
    };

    /**
     * @description 清空webview视图聊天会话消息，以及本地消息文件
     */
    async clearSessionMsg() {
        let result = await hx.window.showInformationMessage("Ask-chatGPT: 确定要清除当前聊天会话的消息吗？ 清除后无法找回。", ["确定", "取消"]);
        if (result != "确定") return;
        rawHistoryMsgList = [];
        this.historyMsgList = [];

        // 清空会话文件
        fs.writeFileSync(this.chat_session_file_path, JSON.stringify([]), "utf-8");

        this.webView.postMessage({
            command: "clearSuccess"
        });
    };
};


/**
 * @description 发送问题
 * @param {Object} question
 *  * @param {Object} webView
 */
async function chatGPT_send_question_for_webview(question, webView=undefined) {
    print_log("log", "[ChatGPT]请求.... openAIApiKey openAIProxyURL = ", openAIApiKey, openAIProxyURL);

    let targetURL = `${openAIProxyURL}/chat/completions`;
    let default_number = 0;
    let chatGPT_messages = [];

    isChatting = true;
    webView.postMessage({command: "beAcquiringChatGPT"});
    rawHistoryMsgList.push({"role": "user","content": question});

    // 附带的上下文消息数量
    default_number = global_chatgpt_context_length;
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

    try {
        let reqData = {
            model: global_chatgpt_model,
            messages: chatGPT_messages,
            // stream: true
        };

        reqData["max_tokens"] = 4000;

        print_log("log", "[日志] 附带的消息数量:", default_number);
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
            let status = error.response.status;
            return error.response.data;
        });
        // print_log("log", "[日志]chatGPT完整响应：", completion);

        if (typeof completion == "string") {
            isChatting = false;
            webView.postMessage({
                command: "currentAssistant",
                content: {"role": "assistant","content": completion}
            });
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
            isChatting = false;
            webView.postMessage({
                command: "currentAssistant",
                content: {"role": "assistant","content": lastErrorMsg}
            });
            return;
        };

        let chatGPT_result = completion.data.choices[0].message;
        print_log("log", "[日志]chatGPT响应：", chatGPT_result);

        // 记录消耗的toaken
        try {
            let usageToken = completion.data.usage.total_tokens;
        } catch (error) {};

        isChatting = false;
        let resTime = getCurrentTime();
        chatGPT_result["date"] = resTime;

        webView.postMessage({
            command: "currentAssistant",
            content: chatGPT_result
        });

        // 保存消息到本地
        rawHistoryMsgList.push(chatGPT_result);
        try {
            const session_file_path = path.join(appDataDir, `${current_chat_session_name}.json`);
            print_log("log", "[日志] 保存会话到本地：", session_file_path);
            fs.writeFileSync(session_file_path, JSON.stringify(rawHistoryMsgList), "utf-8");
        } catch (error) { };

        hx.window.clearStatusBarMessage();
        return chatGPT_result;
    } catch (error) {
        console.log("[程序异常]", JSON.stringify(error));
        let lastErrorMsg = "插件出错了，如在插件配置中自定义过api key和代理地址，请检查是否正确。如无法解决，可联系插件作者。";
        if (targetURL.includes("//api.openai.com")) {
            lastErrorMsg = lastErrorMsg + "请求失败或请求错误。当前请求的URL是openAI官方的地址，国内可能无法访问，请先确认可以正常访问https://api.openai.com。或点击菜单【工具 - Ask ChatGPT】设置，设置代理地址。";
        };

        isChatting = false;
        webView.postMessage({
            command: "currentAssistant",
            content: {"role": "assistant","content": lastErrorMsg}
        });
    };
};


/**
 * @description chatGPT webview视图
 * @param {Object} webviewPanel
 */
async function chatgpt_webview(webviewPanel) {
    let webView = webviewPanel.webView;
    hx.window.showView({
        viewid: 'AskChatGPTView',
        containerid: 'AskChatGPTView'
    });

    let uiData = getThemeColor();
    let sessionNameForHtml = current_chat_session_name == "message" ? "Ask ChatGPT" : current_chat_session_name;
    webView.html = getWebviewContent(uiData, sessionNameForHtml);;

    let session = new ChatGPT_Session(webView);

    // 插件接收webview发送的消息
    webView.onDidReceiveMessage((msg) => {
        if (msg.command == "checkQuestion") {
            hx.window.setStatusBarMessage("Ask-chatGPT: 请输入正确的问题！", 2000, "error");
        };

        if (msg.command == 'sendQuestion') {
            let question = msg.question;
            chatGPT_send_question_for_webview(question, webView);
        };

        if (msg.command == "clear") {
            session.clearSessionMsg();
        };

        if (msg.command == "createSession") {
            session.createNewSession(webView)
        };

        if (msg.command == "switchChat") {
            session.getSessionList(webView);
        };

        if (msg.command == "historyMsg") {
            session.getSessionMsgList();
        };

        if (msg.command == "setting") {
            hx.commands.executeCommand('askChatGPT.setting');
        };

        if (msg.command == "openPrompt") {
            getOpenPrompts(webView);
        };

        if (msg.command == "copyMsg") {
            let text = msg.content;
            hx.env.clipboard.writeText(text);
            hx.window.setStatusBarMessage("Ask-chatGPT: 已复制到剪贴板", 2000, "info");
        }
    });
};

module.exports = chatgpt_webview;
