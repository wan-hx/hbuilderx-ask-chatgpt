const hx = require('hbuilderx');
const path = require('path');
const fs = require('fs');

/**
 * @description 创建聊天对话
 * @param {*} dataDir
 * @returns
 */
async function createChatNameFormDialog(dataDir) {
    let result = await hx.window.showFormDialog({
        title: "chatGPT 新建聊天对话",
        subtitle: ``,
        formItems: [
            {type: "input",name: "chatName",label: "对话名称",placeholder: '聊天会话名称，长度15个字符以内',value: ""},
            {type: "label",name: "chatDesc",text: `<p style="color: gray;font-size: 10px;">对话名称, 如编程助手、JavaScript助手</p>`}
        ],
        width: 480,
        height: 150,
        submitButtonText: "确定(&S)",
        cancelButtonText: "关闭(&C)",
        validate: function(formData) {
            if (formData.chatName.trim() == "") {
                this.showError("chatName不能为空，请填写");
                return false;
            };
            if (formData.chatName.trim() == "message" || formData.chatName.trim() == "default") {
                this.showError("请更换名字，chatName不能使用这个");
                return false;
            };
            if (formData.chatName.length > 10) {
                this.showError("chatName长度不能超过10个字符，请重新填写");
                return false;
            };
            // formData.chatName用于创建文件名，不允许出现特殊字符
            let regChatName = /^[a-zA-Z0-9\u4e00-\u9fa5-_+]+$/;
            if (!regChatName.test(formData.chatName)) {
                this.showError("chatName不允许出现_-+之外的特殊字符，建议输入中文、英文、数字，请重新填写");
                return false;
            };
            let fpath = path.join(dataDir, formData.chatName.trim());
            if (fs.existsSync(fpath)) {
                this.showError("chatName已存在，请重新填写");
                return false;
            };
            return true;
        }
    }).then((res) => {
        return res.chatName;
    }).catch((err) => {
        hx.window.setStatusBarMessage("Ask-chatGPT: 程序出错了，请联系作者！", 10000, "error");
        return undefined;
    });
    if (result != undefined) {
        try {
            let fpath = path.join(dataDir, result+'.json');
            fs.writeFileSync(fpath, JSON.stringify([]), "utf-8");
        } catch (error) {
            hx.window.setStatusBarMessage("Ask-chatGPT: 创建新的聊天会话失败！", 10000, "error");
            return undefined;
        };
    };
    return result;
};

module.exports = createChatNameFormDialog;
