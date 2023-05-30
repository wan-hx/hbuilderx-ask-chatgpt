const hx = require('hbuilderx');
const axios = require('axios');

const {
    createConsoleWindow
} = require("../libs/utils.js");

/**
 * @description 打开图像生成窗口
 * @returns 
 */
async function openImageWindows() {
    let result = await hx.window.showFormDialog({
        title: "ChatGPT AI图像生成",
        subtitle: "",
        formItems: [
            {
                "type": "radioGroup",
                "name": "size",
                "label": "期望生成的图像大小: ",
                "items": [
                    {"label": "256x256","id": "256x256"},
                    {"label": "512x512","id": "512x512"},
                    {"label": "1024x1024","id": "1024x1024"}
                ],
                "value": "512x512"
            },
            {type: "textEditor", name: "prompt", title: "prompt - AI图像提示词",  languageId: "md", value: ""},
            {type: "label", name: "label_1", text: `<p style="color: gray;font-size: 10px;">描述越详细，你得到想要的结果的可能性越大。提示词的一般公式为：绘画对象+对象描述词+风格修饰词</p>`},
            {type: "label", name: "label_2", text: '❗️注意：成功生成图像后，会在控制台输出访问链接。图片URL有效期为1小时。'},
        ],
        width: 500,
        height: 550,
        submitButtonText: "确定(&S)",
        cancelButtonText: "关闭(&C)",
        footer: `<a href="https://wan-dada.github.io/hbuilderx-ask-chatgpt-docs/">查看帮助文档</a>`,
        validate: function(formData) {
            if (formData.prompt == null) {
                this.showError("prompt不能为空");
                return false;
            };
            if (formData.prompt.trim() == "") {
                this.showError("prompt不能为空");
                return false;
            };
            if (formData.prompt.length < 3) {
                this.showError("prompt太短，可能无法，建议多写一点");
                return false;
            };
            return true;
        }
    }).then((res) => {
        return res;
    }).catch((err) => {
        return undefined;
    });

    if (result != undefined) {
        let { prompt, size } = result;
        return {
            "prompt": prompt,
            "size": size
        };
    };
    return result;
};


/**
 * @description 图像生成
 */
async function chatGPTImageGenerations() {

    let promptInfo = await openImageWindows();
    if (promptInfo == undefined) return;
    let {prompt, size} = promptInfo;

    let targetURL = `${openAIProxyURL}/images/generations`;
    let reqData = {
        "prompt": prompt,
        "n": 1,
        "size": size
    };

    try {
        hx.window.setStatusBarMessage("ChatGPT: 正在从网络获取结果..", 10000, "info");
        const completion = await axios({
            method: 'post',
            url: targetURL,
            data: reqData,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAIApiKey}`
            }
        }).catch(function (error) {
            return error.response.data;
        });

        if (typeof completion == "string") {
            createConsoleWindow(`【错误】请求出错，错误消息：${completion}`, "error");
            return;
        };

        if (completion.error) {
            let errorMsg = completion.error.message;
            createConsoleWindow(`【错误】请求出错，错误消息：${errorMsg}`, "error");
            return;
        };

        let url = completion.data.data[0].url;
        createConsoleWindow(`${prompt}, 生成图片地址：${url}`, "info");
        hx.window.clearStatusBarMessage();
    } catch (error) {
        if (targetURL.includes("//api.openai.com")) {
            createConsoleWindow("[请求错误] 当前请求的URL是openAI官方的地址，国内可能无法访问，请先确认可以正常访问https://api.openai.com。或点击菜单【工具 - Ask ChatGPT】设置，设置代理地址。");
            return;
        };
        try{
            let { message } = error;
            hx.window.showErrorMessage(`Ask-chatGPT: 插件执行错误。${message}`, ["我知道了"]);
        }catch(e){
            hx.window.showErrorMessage("Ask-chatGPT: 插件执行错误。如果你自定义过插件设置，请确保设置项有效!", ["我知道了"]);
        };
    };
};

module.exports = chatGPTImageGenerations;
