
// 填写JavaScript
function renderTemplate(template, data) {
            // 在此补全代码
            //通过 正则来查找所有需要替换的模板，然后提取其中的 属性名，进行替换。
            // 同时要对提取的属性名 及其值进行校验，如果 没找到属性或者 属性值为空 则替换为空。
            let reg = new RegExp("/\.+^\{\{*\}\}$/");
            const templateHoles = reg.findAll(template);
            for (const templateHole of templateHoles) {
                // 拿到属性值
                // 去除 . 对后续提取属性的影响
                if (templateHole.startWith(".")) {
                    templateHole = templateHole.slice(1, templateHole.length);
                }
                let property = templateHole.slice(2, templateHole.length-1);
                let replacedString;
                if (typeof data['property'] !== number && typeof data['property'] !== string || typeof data['property'] === undefined)
                {
                    replacedString = '';
                } else {
                    replacedString = String(data['property']);
                }
                templateHole.replacedWhih(replacedString);
            }

        }
const template1 = "{{greeing}}, {{user.name}}! Nice to see you.{{age}}"
const data1 = {
    greeting: 'Hi',
    user: {
        name: 'Alice',
        age: 18
    }
}
renderTemplate(template1, data1);