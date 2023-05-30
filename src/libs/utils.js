const hx = require('hbuilderx');
let http = require('http');
let https = require('https');
let os = require('os');
let path = require('path');
let fs = require('fs');

let osName = os.platform();

const supportLanguageList = [
    "javascript", "typescript", "html", "css", "less", "scss", "sass", "stylus", "vue", "nvue",
    "php", "python", "java", "c", "cpp", "go", "rust", "swift", "kotlin", "dart", "sql", "lua", "perl", "ruby",
    "powershell", "shellscript", "shell"
];

const codingLanguages = {
    ".sh": "shell",
    ".py": "python",
    ".java": "java",
    ".go": "go",
    ".swift": "swift",
    ".php": "php",
    ".cs": "C#",
    ".cpp": "C++",
    ".kt": "Kotlin",
    ".rs": "Rust",
    ".lua": "Lua",
    ".sql": "SQL",
    ".cpp": "C++",
    ".c": "c",
    ".h": "c",
    ".rb": "Ruby",
    ".m": "Objective-C",
    ".scala": "Scala",
    ".dart": "Dart",
    ".pl": "Perl",
    ".coffee": "CoffeeScript",
    ".vue": "Vue",
    ".nvue": "Vue"
};

/**
 * @description 对话框
 *     - 插件API: hx.window.showMessageBox
 *     - 已屏蔽esc事件，不支持esc关闭弹窗；因此弹窗上的x按钮，也无法点击。
 *     - 按钮组中必须提供`关闭`操作。且关闭按钮需要位于数组最后。
 * @param {String} title
 * @param {String} text
 * @param {String} buttons 按钮，必须大于1个
 * @return {String}
 */
async function hxShowMessageBox(title, text, buttons = ['关闭']) {
    return new Promise((resolve, reject) => {
        if ( buttons.length > 1 && (buttons.includes('关闭') || buttons.includes('取消')) ) {
            if (osName == 'darwin') {
                buttons = buttons.reverse();
            };
        };
        hx.window.showMessageBox({
            type: 'info',
            title: title,
            text: text,
            buttons: buttons,
            defaultButton: 0,
            escapeButton: -100
        }).then(button => {
            resolve(button);
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * @description 获取HBuilderX配置
 * @param {Object} options
 */
async function getHBuilderXConfig(optionsName) {
    let config = await hx.workspace.getConfiguration();
    return config.get(optionsName);
};

async function updateHBuilderXConfig(pluginName, key, value) {
    try{
        let config = hx.workspace.getConfiguration(pluginName);
        config.update(key, value).then((data) => {
            if (!["lastChatSessionName"].includes(key)) {
                let msg = "Ask_ChatGPT: 更新配置项成功";
                hx.window.setStatusBarMessage(msg, 2000, 'info');
            };
        }).catch((err) => {
            hx.window.showInformationMessage("Ask_ChatGPT: 更新配置项失败");
        });
    }catch(e){
        console.log(e)
    }
};

/**
 * @description http get请求
 * @param {string} url
 */
async function httpGet(url, data_type) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                try{
                    if (data_type == "json") {
                        resolve(JSON.parse(data));
                    } else {
                        resolve(data);
                    };
                }catch(e){
                    reject("error");
                };
            });
            res.on("error", (e) => {
                reject("error");
            });
        }).on("error", (e) => {
            reject("Error: " + e.message);
        });
    });
};

/**
 * @description 检查Ask-chatGPT插件版本
 * @returns boolean
 */
async function checkPluginVersion() {
    try {
        let chatgpt_plugin_version = require('../../package.json').version;
        const hxMarketURL = "http://download1.dcloud.net.cn/hbuilderx/marketplace/plugin.json";
        const resMarket = await httpGet(hxMarketURL, "json").catch(error=> {
            return {};
        });
        const plugin = resMarket.find((item) => item.name === 'Ask-chatGPT');
        if (plugin.version !== chatgpt_plugin_version) {
            const btn = await hxShowMessageBox("提示", "Ask-chatGPT有新版本了，功能更丰富，建议升级使用!", ["去安装", "关闭"]);
            if (btn === "去安装") {
                hx.env.openExternal("https://ext.dcloud.net.cn/plugin?name=Ask-chatGPT");
            }
            return false;
        }
        return true;
    } catch (e) {
        console.error("--> 访问错误", e);
        return true;
    }
};


/**
 * @description 获取当前时间
 */
function getCurrentTime() {
    let now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let day = now.getDate();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes + ':' + seconds;
};

/**
 * @description 获取编辑器选中的文本
 * @returns {Object} 语言id和选中的文本
 */
async function getEditorSelectionText() {
    const defaultSupportLanguage = [ "javascript", "typescript", "html", "css", "less", "scss", "sass", "stylus", "php" ];
    const codingLanguagesSuffix = Object.keys(codingLanguages);

    let projectType = "";
    let text = await hx.window.getActiveTextEditor().then(function(editor) {

        let projectNature = editor.document.workspaceFolder.nature;
        if (projectNature && projectNature != "") {
            projectNature = projectNature.toLowerCase()
            if (projectNature.includes("uni")) {
                projectType = "uniapp";
            };
        };
        let language = editor.document.languageId;
        let filename = editor.document.fileName;
        if (!defaultSupportLanguage.includes(language.toLowerCase())) {
            let fileExtname = path.extname(filename);
            let suffix = fileExtname.toLowerCase();
            if (codingLanguagesSuffix.includes(suffix)) {
                language = codingLanguages[`${suffix}`];
            };
        };
        let selectionText = editor.document.getText(editor.selection);
        return {filename, language, selectionText, projectType}
    });
    return text;
};

/**
 * @description 替换选中内容
 * @param {String} 文件名
 * @param {String} answer_content
 * @param {String} hx_handle
 */
async function HBuilderXEditorHandle(filename, answer_content, hx_handle) {
    if (hx_handle == "insert_on_next_line") {
        await hx.commands.executeCommand("editor.action.insertLineAfter");
    };
    await hx.window.getActiveTextEditor().then(function(editor) {
        let currentFilename = editor.document.fileName;
        if (currentFilename != filename) {
            hx.env.clipboard.writeText(answer_content);
            hx.window.setStatusBarMessage("ASK-ChatGPT: 当前文件名与提问时的文件名不一致，已将答案写入到剪切板", 5000, 'error');
            return;
        };
        let active = editor.selection.active;
        let selection = editor.selection;
        // console.error("--->", active, selection);
        if (hx_handle == "replace") {
            editor.edit(editBuilder => {
                editBuilder.replace(selection, answer_content);
            });
        };
        if (hx_handle == "insert_the_cursor" || hx_handle == "insert_on_next_line") {
            let workspaceEdit = new hx.WorkspaceEdit();
            let edits = [];
            edits.push(new hx.TextEdit({
                start: active,
                end: active
            }, answer_content));
            workspaceEdit.set(editor.document.uri, edits);
            hx.workspace.applyEdit(workspaceEdit);
        };
    });
};

/**
 * @description 创建独立输出控制台
 * @param {String} msg
 * @param {msgLevel} msgLevel (warning | success | error | info), 控制文本颜色
 */
function createConsoleWindow(msg, msgLevel=undefined) {
    let outputView = hx.window.createOutputView({"id":"Ask-ChatGPT_Actions","title":"ChatGPT_Actions"});
    outputView.show();

    outputView.appendLine({
        line: msg,
        level: msgLevel,
    });
};

/**
 * @description 创建输出控制台, 支持文件链接跳转
 * @param {String} msg
 * @param {String} msgLevel (warning | success | error | info), 控制文本颜色
 * @param {String} linkText 链接文本
 */
function hxConsoleOutputForLink(msg, linkText, msgLevel='info') {
    let outputView = hx.window.createOutputView({"id":"Ask-ChatGPT","title":"Ask-ChatGPT"});
    outputView.show();

    if (linkText == undefined || linkText == '') {
        outputView.appendLine({
            line: msg,
            level: msgLevel,
        });
        return;
    };

    let start;
    if (msg.includes(linkText) && linkText != undefined) {
        start = msg.indexOf(linkText);
    };

    outputView.appendLine({
        line: msg,
        level: msgLevel,
        hyperlinks:[
            {
                linkPosition: {
                    start: start,
                    end: start + linkText.length
                },
                onOpen: function() {
                    if (fs.existsSync(linkText)) {
                        return hx.workspace.openTextDocument(linkText);
                    };
                }
            }
        ]
    });
};

/**
 * @description 去除字符串开头和结尾的引号
 * @param {Object} str
 */
function stripQuotes(str) {
    const reg = new RegExp(/^(\"|\')|(\"|\')$/g);
    if (reg.test(str)) {
        return str.slice(1, -1);
    }
    return str;
};

function print_log(msg_type, message, ...args) {
    // 调试模式
    const isDebug = true;
    if (isDebug) {
        if (msg_type == "error") {
            console.error(message, ...args);
        } else {
            console.log(message, ...args);
        };
    };
};

module.exports = {
    httpGet,
    checkPluginVersion,
    getCurrentTime,
    hxShowMessageBox,
    getHBuilderXConfig,
    updateHBuilderXConfig,
    getEditorSelectionText,
    HBuilderXEditorHandle,
    createConsoleWindow,
    hxConsoleOutputForLink,
    supportLanguageList,
    stripQuotes,
    print_log
}
