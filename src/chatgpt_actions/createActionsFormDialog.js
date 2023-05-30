const hx = require('hbuilderx');
let http = require('http');
let https = require('https');
let os = require('os');
let path = require('path');
let fs = require('fs');

async function createActionsFormDialog() {
    let hx_actions_text = ["将ChatGPT结果，输出到控制台", "将ChatGPT结果，替换选中内容", "将ChatGPT结果，在光标位置插入", "将ChatGPT结果，在下一行插入"];
    let hx_actions = ["console", "replace", "insert_the_cursor", "insert_on_next_line"];
    let result = await hx.window.showFormDialog({
        title: "ChatGPT - 新建Action",
        subtitle: `何为Action？获取到ChatGPT的结果后，在HBuilderX中触发的操作，如替换、\n插入、输出到控制台等`,
        formItems: [
            {type: "input",name: "action_label",label: "名称",placeholder: 'action名称，用于显示，比如翻译选中内容为英语',value: ""},
            {type: "input",name: "action_desc",label: "描述",placeholder: 'action描述',value: ""},
            {type: "label", name: "label_1", text: 'ChatGPT请求，例子: ${selected}翻译为英文. ${selected}代表编辑器选中的内容。'},
            {type: "textEditor", name: "action_context", title: "请求内容",  languageId: "md", value: ""},
            {type: "label", name: "label_2", text: ''},
            {
                type: "comboBox",
                name: "hx_handle",
                items: hx_actions_text,
                index:0
            },
            {type: "label", name: "label_3", text: ''}
        ],
        width: 500,
        height: 550,
        submitButtonText: "确定(&S)",
        cancelButtonText: "关闭(&C)",
        footer: `<a href="https://wan-dada.github.io/hbuilderx-ask-chatgpt-docs/">查看帮助文档</a>`,
        validate: function(formData) {
            if (formData.action_label.trim() == "" || formData.action_label.length > 20) {
                this.showError("名称不能为空，且长度不能大于20，请重新填写");
                return false;
            };
            if (formData.action_desc.trim() == "" || formData.action_desc.length > 20) {
                this.showError("描述不能为空，且长度不能大于20，请重新填写");
                return false;
            };
            if (formData.action_context.trim() == "" || formData.action_context.length > 100) {
                this.showError("内容不能为空，且长度不能大于100，请重新填写");
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
        let { action_label, action_desc, action_context } = result;
        return {
            "label": action_label,
            "description": action_desc,
            "chat_action": action_context,
            "hx_action": hx_actions["hx_handle"]
        };
    };
    return result;
};

module.exports = createActionsFormDialog;
