const hx = require('hbuilderx');
const {
    getHBuilderXConfig,
    updateHBuilderXConfig,
    hxConsoleOutputForLink,
} = require('./utils.js');

async function showPluginPrompts() {
    let cfg = await getHBuilderXConfig("askChatGPT.pluginHints");
    if (cfg != undefined) return;

    let text = `

以下提示，您将只看到1次，后期将不再提醒。

1. ChatGPT并不是免费的，尤其是调用openai api。注册chatGPT账号后，chatGPT官方提供了一定的免费额度。免费额度用完后，就需要充值，而且是不支持中国境内银行卡/信用卡。

2. 当前插件调用chatGPT API，是使用的插件作者的账户，额度有限，因此设置了每人每天使用token数量。请勿再问为什么不能无限使用。
   当然，您也可以在【工具 - Ask-ChatGPT - 设置】中，设置自己的openai api key和proxyURL。

3. 简洁的提问，能够节省token。用英文提问比用中文提问节省token。

4. 调用chatGPT API， 每次请求携带的历史消息数，默认为4。附带消息数越多，消耗的token越多。如果不需要上下文，可以在菜单【工具 - Ask-ChatGPT - 设置】，将附带历史消息数设置为0.

5. 想要让chatGPT产出有效的回答，需要遵循以下五个原则：
   - 提问清晰：请尽可能清晰地描述您的问题
   - 简明扼要：请尽量使用简单的语言和简洁的句子来表达您的问题
   - 确认问题：请确认您的问题是清晰、明确和完整
   - 单一提问：请一个一个地问，而不是把所有问题放在一个问题中
   - 不要提供敏感信息：请不要在您的问题中提供任何个人敏感信息
`
    hxConsoleOutputForLink(text, "https://wan-dada.github.io/hbuilderx-ask-chatgpt-docs");

    // 更新配置
    await updateHBuilderXConfig("askChatGPT", "pluginHints", true);
};

module.exports = showPluginPrompts;
