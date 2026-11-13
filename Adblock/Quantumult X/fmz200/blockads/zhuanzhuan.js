let url = $request.url;
let responseBody = $response.body;
try {
    responseBody = JSON.parse(responseBody);
    delete responseBody.respData.bmNewInfo;
    responseBody.respData.itemGroupList = responseBody.respData.itemGroupList.map(itemGroup => {
        if (itemGroup.groupType === 15) {
            return null;
        }
        else if (itemGroup.groupType === 3) {
            itemGroup.itemList = itemGroup.itemList.slice(0, 4);
        }
        return itemGroup;
    }).filter(Boolean);
    console.log('转转APP处理完成✅');
}
catch (error) {
    console.log('脚本运行出现错误，部分内容未生效⚠️');
    console.log('错误信息：' + error.message);
}
$done({ body: JSON.stringify(responseBody) });
