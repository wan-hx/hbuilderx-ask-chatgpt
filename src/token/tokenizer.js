
const hx = require('hbuilderx');
const { GPTTokens } = require('gpt-tokens')

var chatGPT_context = "";
var chatGPT_models = "gpt-3.5-turbo";

function getTokenNumber(text) {
    let data = {
        model: chatGPT_models,
        messages: [{
            "role": "user",
            "content": text
        }]
    };
    let chat_tokens = new GPTTokens(data);
    chat_tokens_num = chat_tokens.usedTokens;
    return chat_tokens_num;
};

/**
 * @description 窗口控件
 * @param {Object} selected
 */
function getUIData(selected) {
    let models = ["gpt-3.5-turbo"];

    let tokenNumber = getTokenNumber(chatGPT_context);
    let uiData = {
        title: "ChatGPT - Token计算",
        subtitle: ``,
        formItems: [
            {
                type: "comboBox",
                name: "models",
                items: models,
                index: 0
            },
            {type: "label", name: "label_1", text: ''},
            {type: "textEditor", name: "context", title: "Text", languageId: "md", value: chatGPT_context, text: chatGPT_context},
            {type: "label", name: "label_2", text: ''},
            {type: "label", name: "tokenNumber", text: `<p style="color: green; font-size: 20px;">Token: ${tokenNumber} </p>`}
        ],
    }
    return uiData;
};

async function tokenizer() {
    let uidata = getUIData();

    let result = await hx.window.showFormDialog({
        ...uidata,
        width: 500,
        height: 550,
        submitButtonText: "确定(&S)",
        cancelButtonText: "关闭(&C)",
        footer: ``,
        validate: function(formData) {
            return true;
        },
        onChanged: function(field, value) {
            if (field == "context") {
                chatGPT_context = value;
            };
            if (field == "models") {
                chatGPT_models = value;
            };
            if (field == "context" || field == "models") {
                let updateData = getUIData();
                this.updateForm(updateData);
            };
        }
    }).then((res) => {
        return res;
    }).catch((err) => {
        return undefined;
    });
    return result;
};

module.exports = tokenizer;
