const hx = require('hbuilderx');

const path = require('path');
const os = require('os');
const osName = os.platform();

const vueFile = path.join(path.resolve(__dirname), 'static', '','vue.min.js');
const markedFile = path.join(path.resolve(__dirname), 'static', 'marked.min.js');
const bootstrapCssFile = path.join(path.resolve(__dirname), 'static', 'bootstrap.min.css');
const inputCssFile = path.join(path.resolve(__dirname), 'static', 'input.css');
const webviewCssFile = path.join(path.resolve(__dirname), 'static', 'webview.css');

let chatGPTicon = path.join(path.resolve(__dirname), 'static', 'file-icon','chatgpt.svg');
let myicon = path.join(path.resolve(__dirname), 'static', 'file-icon','my.svg');
let chat_icon_add = path.join(path.resolve(__dirname), 'static', 'file-icon','add.svg');
let chat_icon_clear = path.join(path.resolve(__dirname), 'static', 'file-icon','clear.svg');
let chat_icon_config = path.join(path.resolve(__dirname), 'static', 'file-icon','config.svg');
let chat_icon_prompt = path.join(path.resolve(__dirname), 'static', 'file-icon','prompt.svg');
let chat_icon_send = path.join(path.resolve(__dirname), 'static', 'file-icon','send.svg');
let chat_icon_switch = path.join(path.resolve(__dirname), 'static', 'file-icon','switch.svg');

if ( osName != 'darwin') {
    chatGPTicon = chatGPTicon.replace(/\\/g, '/');
    myicon = myicon.replace(/\\/g, '/');
    chat_icon_add = chat_icon_add.replace(/\\/g, '/');
    chat_icon_clear = chat_icon_clear.replace(/\\/g, '/');
    chat_icon_config = chat_icon_config.replace(/\\/g, '/');
    chat_icon_prompt = chat_icon_prompt.replace(/\\/g, '/');
    chat_icon_send = chat_icon_send.replace(/\\/g, '/');
    chat_icon_switch = chat_icon_switch.replace(/\\/g, '/');
};

function getWebviewContent(uiData, sessionName) {

    // icon
    let {
        fontSize,
        background,
        lefeSideVeiwBackground,
        menuBackground,
        liHoverBackground,
        inputColor,
        inputLineColor,
        inputBgColor,
        cursorColor,
        fontColor,
        remarkTextColor,
        lineColor,
        scrollbarColor,
        codeColor
    } = uiData;

    let ctrl = 'ctrl';
    let questionPlaceholder = `输入消息，Ctrl + Enter发送\n输入 / 即可打开提示词`;
    if (osName == 'darwin') {
        ctrl = 'meta';
        questionPlaceholder = `输入消息，${ctrl} + Enter发送\n输入 / 即可打开提示词`
    };

    setTimeout(function() {
        hx.window.setStatusBarMessage("提示：一个好的prompt可以让chatGPT更好的理解你的问题，并且可以节省token哦", 8000, "info");
    }, 3000);

    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="${bootstrapCssFile}">
        <link rel="stylesheet" href="${inputCssFile}">
        <script src="${vueFile}"></script>
        <script src="${markedFile}"></script>
        <style type="text/css">
            :root {
                --fontSize: ${fontSize};
                --background: ${lefeSideVeiwBackground};
                --remarkTextColor: ${remarkTextColor};
                --fontColor: ${fontColor};
                --lineColor: ${lineColor};
                --inputBgColor: ${inputBgColor};
                --inputLineColor: ${inputLineColor};
                --scrollbarColor: ${scrollbarColor};
                --menuBackground: ${menuBackground};
                --liHoverBackground: ${liHoverBackground};
                --inputColor: ${inputColor};
                --cursorColor: ${cursorColor};
                --codeColor: ${codeColor};
            }
        </style>
        <link rel="stylesheet" href="${webviewCssFile}">
    </head>
    <body>
        <div id="app" v-cloak>
            <div class="container-fluid pb-5">
                <div id="page-top" class="fixed-top">
                    <div class="row px-3">
                        <div class="col-auto no-wrap pr-0 top_title">
                            <span class="top" @click="switchChat()">{{ currentChatSessionName }}</span>
                        </div>
                        <div class="col-auto ml-auto pl-0 top_action">
                            <span @click="openAddNewChat()" title="添加新的聊天会话"><img :src="chat_icon_add" /></span>
                            <span @click="switchChat()" title="切换其它会话"><img :src="chat_icon_switch" /></span>
                            <span @click="openClear()" title="清除历史消息"><img :src="chat_icon_clear" /></span>
                            <span @click="openSetting()" title="打开chatGPT配置"><img :src="chat_icon_config" /></span>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 3rem;"></div>
                <div class="row mx-0" v-for="(item, idx) in historyList">
                    <div name="assistant" class="col px-0 box_assistant" v-if="item.role == 'assistant'">
                        <div class="py-2">
                            <img :src="chatGPTicon" class="chatgpt_icon" />
                            <span class="chat_msg_time">{{ item.date }}</span>
                            <span class="copy_msg" @click="copyMsg(item.RawContent)">复制</span>
                        </div>
                        <div>
                            <div class="chat_content" v-html="item.content"></div>
                        </div>
                    </div>
                    <div name="user" class="col px-0" style="text-align: right;" v-if="item.role == 'user'">
                        <div class="py-2">
                            <span class="chat_msg_time">{{ item.date }}</span>
                            <img :src="myicon" class="chatgpt_icon"/>
                        </div>
                        <div>
                            <div  class="chat_content_user" v-html="item.content"></div>
                        </div>
                    </div>
                </div>
                <div name="is-input" class="row mx-0">
                    <div class="col-12 px-0">
                        <div id="do-input" class="chat_user" v-if="userInputQuestion.length != 0 ">
                            <div class="my-2" style="text-align: right;">
                                <span class="chat_msg_time" v-show="beInputting">正在输入...</span>
                                <img :src="myicon" class="chatgpt_icon"/>
                            </div>
                            <div class="col-auto chat_content_user" v-html="userInputQuestion"></div>
                        </div>
                    </div>
                    <div class="col-12 px-0">
                        <div id="be-acquiring-ChatGPT mt-2" class="col-12 px-0" v-if="beAcquiringChatGPT">
                            <div class="my-2">
                                <img :src="chatGPTicon" class="chatgpt_icon"/>
                                <span class="chat_msg_time" v-show="beAcquiringChatGPT">正在输入...</span>
                            </div>
                            <div class="chat_content">
                                <div class="spinner">
                                    <div class="rect1"></div>
                                    <div class="rect2"></div>
                                    <div class="rect3"></div>
                                    <div class="rect4"></div>
                                    <div class="rect5"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 6rem;"></div>
            </div>
            <div id="page-bottom" class="container-fluid">
                <div class="row m-0 fixedBottom">
                    <div class="col mb-2">
                        <!-- <div>
                            <button class="btn btn-outline-primary btn-sm" @click="stopResponse()">停止响应</button>
                        </div> -->
                        <textarea rows=1
                            id="question"
                            v-model="question"
                            class="form-control outline-none textarea form-control-bg"
                            placeholder="${questionPlaceholder}"
                            @keyup.${ctrl}.enter="sendQuestion();">
                        </textarea>
                        <div class="input_action">
                            <img :src="chat_icon_prompt" @click="openPrompt()" title="打开Prompt" />
                            <img :src="chat_icon_send" @click="sendQuestion()" title="发送消息" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <script>
            var app = new Vue({
                el: '#app',
                data: {
                    question: "",
                    beInputting: false,
                    beAcquiringChatGPT: false,
                    chatGPTicon: "${chatGPTicon}",
                    myicon: "${myicon}",
                    chat_icon_add: "${chat_icon_add}",
                    chat_icon_clear: "${chat_icon_clear}",
                    chat_icon_config: "${chat_icon_config}",
                    chat_icon_prompt: "${chat_icon_prompt}",
                    chat_icon_send: "${chat_icon_send}",
                    chat_icon_switch: "${chat_icon_switch}",
                    defaultMessage: [{"role": "assistant", "content": "有什么可以帮你的吗","date": ""}],
                    historyList: [],
                    currentAssistant: "",
                    currentChatSessionName: "${sessionName}"
                },
                watch: {
                    question: function (newv, oldv) {
                        if (this.question == "/") {
                            this.openPrompt()
                            return;
                        };
                        this.beInputting = true;
                        this.isScrollBottom();
                    },
                    currentChatSessionName: function (newv, oldv) {
                        this.question = "";
                        this.currentAssistant = "";
                        this.beInputting = false;
                        this.beAcquiringChatGPT = false;
                        this.getHistoryMsg();
                    },
                    beAcquiringChatGPT: function (newv, oldv) {
                        let that = this;
                        setTimeout(function() {
                            that.isScrollBottom();
                        }, 200);
                    }
                },
                computed:{
                    userInputQuestion() {
                        return marked.parse(this.question);
                    }
                },
                mounted() {
                    let that = this;
                    window.onload = function() {
                        setTimeout(function(){
                            that.getHistoryMsg();
                            that.receiveInfo();
                        }, 100);
                        setTimeout(function() {
                            that.isScrollBottom();
                        }, 300);
                    };

                    document.getElementById('question').focus();
                },
                methods: {
                    isScrollBottom() {
                        window.scrollTo(0,document.body.scrollHeight);
                    },
                    receiveInfo() {
                        let that = this;
                        hbuilderx.onDidReceiveMessage((msg) => {
                            // console.log("--->", msg);
                            if (msg.command == 'historyMsg') {
                                let data = msg.content;
                                if (data.length != 0) {
                                    that.historyList = data;
                                } else {
                                    that.historyList = that.defaultMessage;
                                };
                                // console.log(typeof data, data, that.historyList);
                            };
                            if (msg.command == "currentAssistant") {
                                that.beAcquiringChatGPT = false;
                                let data = msg.content;
                                if (data.length == 0) return;
                                data["RawContent"] = data.content;
                                data["content"] = marked.parse(data.content);
                                that.historyList.push(data);
                                that.isScrollBottom();
                            };
                            if (msg.command == "beAcquiringChatGPT") {
                                that.beAcquiringChatGPT = true;
                            };
                            if (msg.command == "prompt") {
                                that.question = msg.content
                            };
                            if (msg.command == "createSession") {
                                that.currentChatSessionName = msg.content;
                            };
                            if (msg.command == "switchSession") {
                                that.currentChatSessionName = msg.content;
                            };
                            if (msg.command == "clearSuccess") {
                                that.historyList = that.defaultMessage;
                            };
                        });
                    },
                    sendQuestion() {
                        let check = this.checkQuestion();
                        if (!check) return;

                        hbuilderx.postMessage({
                            command: 'sendQuestion',
                            question: this.question
                        });
                        let currentTime = this.getCurrentTime();
                        this.historyList.push({
                            "role": "user",
                            "content": this.question,
                            "date": currentTime
                        });
                        this.question = "";
                        this.beInputting = false;
                    },
                    checkQuestion() {
                        if (this.question.trim() == "") {
                            hbuilderx.postMessage({
                                command: 'checkQuestion',
                                question: this.question
                            });
                            return false;
                        };
                        return true;
                    },
                    getHistoryMsg() {
                        hbuilderx.postMessage({
                            command: 'historyMsg'
                        });
                    },
                    openSetting() {
                        hbuilderx.postMessage({
                            command: 'setting'
                        });
                    },
                    openClear() {
                        this.questsion = "";
                        this.currentAssistant = "";
                        this.beInputting = false;
                        this.beAcquiringChatGPT = false;
                        hbuilderx.postMessage({
                            command: 'clear',
                            session: this.currentChatSessionName
                        });
                    },
                    openCommandPanel() {
                        hbuilderx.postMessage({
                            command: 'openCommandPanel'
                        });
                    },
                    openPrompt() {
                        hbuilderx.postMessage({
                            command: 'openPrompt'
                        });
                    },
                    openAddNewChat() {
                        hbuilderx.postMessage({
                            command: 'createSession'
                        });
                    },
                    switchChat() {
                        hbuilderx.postMessage({
                            command: 'switchChat'
                        });
                    },
                    stopResponse() {
                        hbuilderx.postMessage({
                            command: 'stopResponse'
                        });
                    },
                    copyMsg(text) {
                        hbuilderx.postMessage({
                            command: 'copyMsg',
                            content: text
                        });
                    },
                    getCurrentTime() {
                        let now = new Date();
                        let year = now.getFullYear();
                        let month = now.getMonth() + 1;
                        let day = now.getDate();
                        let hours = now.getHours();
                        let minutes = now.getMinutes();
                        let seconds = now.getSeconds();
                        return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes + ':' + seconds;
                    }
                }
            });
        </script>
        <script>
            // window.oncontextmenu = function() {
            //     event.preventDefault();
            //     return false;
            // };
        </script>
    </body>
</html>
`;
};


module.exports = getWebviewContent;
