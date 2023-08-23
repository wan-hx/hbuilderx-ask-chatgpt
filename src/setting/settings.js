const hx = require('hbuilderx');

const {
    getHBuilderXConfig,
    updateHBuilderXConfig,
} = require("../libs/utils.js");

const chatGPTModelList = [
    'gpt-3.5-turbo', 'gpt-3.5-turbo-0301',
    'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-16k-0613',
    'gpt-4', 'gpt-4-0314', 'gpt-4-32k', 'gpt-4-32k-0314'
];

let init_configurationMethod = "";
let init_proxyURL = "";
let init_apiKey = "";
let init_historyMsgNumber = "";
let ChatGPTModelIndex = 0;

/**
 * @description 窗口控件
 * @param {Object} selected
 */
function getUIData() {

    const cssStyle = `style="font-size: 11px;color: #9d9d9d;"`;
    const subtitle = ``

    const apiKeyText = `<p ${cssStyle}>1. openai API Key，需要您有chatGPT账号。如有账号，请打开<a href="https://platform.openai.com/account/api-keys">openai申请Key</a>生成api key.</p>`;
    const proxyURLText = `<p ${cssStyle}>2. ChatGPT Server 默认地址，中国地区是无法访问的。如有代理，请输入您可以正常访问填写的URL。</p>`;

    const introText = `<p ${cssStyle}>如需chatGPT账号，可联系插件开发者, 加QQ群，进群at群主或私聊群主</p>`
    const msgNumberText = `<p ${cssStyle}>每次请求携带的历史消息数，默认为4。附带上下文消息越多，消耗的token越多。</p>`;

    const qqLink = "https://qm.qq.com/cgi-bin/qm/qr?k=vSm_afxx96G8SDjfes9OVRNSYF9Q_uW4&jump_from=webapi&authKey=tDaqRE/rQWjg+aae/HTP1Q9KmoXyCpl3wnDok+EX3MO6zWvVrNN/lP46JTuST4K6"
    const footerText = `<a target="_blank" href="${qqLink}">QQ群：637837866</a>`;

    let ui_chatGPT_model_list = chatGPTModelList.map(item => "模型：" + item);

    let UIItems = [
        {
            "type": "radioGroup",
            "name": "configurationMethod",
            "label": "",
            "items": [
                // {"label": " 插件内置ChatGPT配置 ","id": "plugin-built-in"},
                {"label": " 自定义配置ChatGPT api key和Server","id": "custom-api-key"}
            ],
            "value": init_configurationMethod
        },
        {
            type: "comboBox",
            name: "ChatGPTModel",
            items: ui_chatGPT_model_list,
            index: ChatGPTModelIndex
        }
    ];

    if (init_configurationMethod == "custom-api-key") {
        const ui_api = {type: "input",name: "apiKey",label: "OpenAI API Key",placeholder: 'sk-*',value: init_apiKey};
        UIItems.push(ui_api);

        const ui_proxy = {type: "input",name: "proxyURL",label: "ChatGPT Server",placeholder: '以https://开头v1结尾。如无，请填写官方https://api.openai.com/v1', value: init_proxyURL};
        UIItems.push(ui_proxy);
    };

    let otherUI = [
        // {type: "label",name: "model",text: "ChatGPT Model (默认为gpt-3.5-trubo，如选择gpt-4，请确认您的ChatGPT账号已开通plus)"},
        {type: "input",name: "historyMsgNumber",label: "附带历史消息数",placeholder: '默认为4。每次请求附带上下文消息越多，消耗的token越多.',value: `${init_historyMsgNumber}`},

    ];

    if (init_configurationMethod == "custom-api-key") {
        otherUI.push({type: "label",name: "apiKeyText",text: apiKeyText});
        otherUI.push({type: "label",name: "proxyURLText",text: proxyURLText});
    } else {
        otherUI.push({type: "label",name: "msgNumberText",text: msgNumberText});
        otherUI.push({type: "label",name: "introText",text: introText});
    }

    let uiData = {
        title: "ChatGPT 自定义配置",
        subtitle: subtitle,
        width: 450,
        height: 280,
        formItems: [
            ...UIItems,
            ...otherUI
        ],
        footer: footerText
    };
    return uiData;
};

/**
 * @description 打开插件设置窗口
 */
async function showPluginSettings() {
    init_proxyURL = await getHBuilderXConfig("askChatGPT.proxyURL");
    init_apiKey = await getHBuilderXConfig("askChatGPT.apiKey");
    init_historyMsgNumber = await getHBuilderXConfig("askChatGPT.NumberOfAttachedHistoryMessages");
    init_cfg_ChatGPTModel = await getHBuilderXConfig("askChatGPT.ChatGPTModel");
    init_configurationMethod = await getHBuilderXConfig("askChatGPT.configurationMethod");

    if (init_proxyURL == undefined) {
        init_proxyURL = "";
    };
    if (init_apiKey == undefined) {
        init_apiKey = "";
    };

    if (init_historyMsgNumber == undefined || init_historyMsgNumber.trim() == "") {
        init_historyMsgNumber = 4;
    };

    ChatGPTModelIndex = 0;
    if (init_cfg_ChatGPTModel && chatGPTModelList.includes(init_cfg_ChatGPTModel)) {
        ChatGPTModelIndex = chatGPTModelList.indexOf(init_cfg_ChatGPTModel);
    };

    init_configurationMethod = "custom-api-key";

    // if (init_configurationMethod == undefined || init_configurationMethod.trim() == "" || !["plugin-built-in", "custom-api-key"].includes(init_configurationMethod)) {
    //     init_configurationMethod = "custom-api-key";
    // };

    let uidata = getUIData();

    let result = await hx.window.showFormDialog({
        ...uidata,
        submitButtonText: "确定(&S)",
        cancelButtonText: "关闭(&C)",
        onChanged: function(field, value) {
            if (field == "configurationMethod") {
                init_configurationMethod = value;
                let tmp = getUIData();
                this.updateForm(tmp);
            };
            if (field == "apiKey") {
                init_apiKey = value;
            };
            if (field == "proxyURL") {
                init_proxyURL = value;
            };
            if (field == "proxyURL") {
                init_historyMsgNumber = value;
            };
            if (field == "ChatGPTModelIndex") {
                ChatGPTModelIndex = value;
            };
        },
        validate: function(formData) {
            if (formData.configurationMethod == "custom-api-key") {
                if (!formData.apiKey.includes("sk-")) {
                    this.showError("apiKey不是有效的，请重新填写");
                    return false;
                };
                let regProxyURL = /^https:\/\/.*\/v1$/;
                if (!regProxyURL.test(formData.proxyURL)) {
                    this.showError("URL必须以https://开头，v1结尾");
                    return false;
                };
            };
            if (formData.historyMsgNumber.trim() != "") {
                let regNumber = /^[0-9]$|^10$/;
                if (!regNumber.test(formData.historyMsgNumber)) {
                    this.showError("附带历史消息数必须为数字, 且不能大于10");
                    return false;
                }
            };
            return true;
        }
    }).then((res) => {
        return res;
    }).catch((err) => {
        return undefined;
    });

    if (result == undefined) return;

    let configurationWay = result.configurationMethod;
    updateHBuilderXConfig("askChatGPT", "configurationMethod", configurationWay);

    // 模型选择
    const lastModelIndex = result.ChatGPTModel;
    if (ChatGPTModelIndex != lastModelIndex) {
        updateHBuilderXConfig("askChatGPT", "ChatGPTModel", chatGPTModelList[lastModelIndex].replace("模型：", ""));
    };

    if (configurationWay == "custom-api-key") {
        // 代理地址
        let user_custom_ChatGPT_server_url = (result.proxyURL).trim();
        updateHBuilderXConfig("askChatGPT", "proxyURL", user_custom_ChatGPT_server_url);

        // api key
        let user_custom_openai_api_key = (result.apiKey).trim();
        updateHBuilderXConfig("askChatGPT", "apiKey", user_custom_openai_api_key);
    };

    // 附带历史消息数
    let user_NumberOfAttachedHistoryMessages = (result.historyMsgNumber).trim();
    if (init_historyMsgNumber != user_NumberOfAttachedHistoryMessages) {
        updateHBuilderXConfig("askChatGPT", "NumberOfAttachedHistoryMessages", user_NumberOfAttachedHistoryMessages);
    };
    return result;
};

module.exports = {
    showPluginSettings,
    chatGPTModelList
};
