var tabs            = require('sdk/tabs');
var timers          = require('sdk/timers');
var file            = require("sdk/io/file");
var system          = require("sdk/system");
var logger          = require('./logger.js');
var abpobs          = require('./abpobserver.js');
var utils           = require('./utils.js');
var extractor       = require('./extractor.js');
var blockdata       = require('./blockdata.js');

var gUrlList = null;
var gFinishDocCount = 0;
var gTabInfos = {};
var gOutputFile = null;
var gQuitOnStop = false;

const TABS_LIMIT = 30;
const WND_TIMEOUT = 20000; //30s, window加载超过这个时间则会停止并且抽取特征
const TAB_TIMEOUT = 25000; //40s, tab加载超过这个时间则会停止且关闭，需要大于WND_TIMEOUT
const URL_LIMIT = 0;

function startCrawling(urlList, outputFile)
{
    logger.debug('start crawing: url count is ' + urlList.length);
    //从url列表加载网页
    gUrlList = urlList;
    if (URL_LIMIT)
        gUrlList = gUrlList.slice(0, URL_LIMIT);
        
    gOutputFile = file.open(outputFile, "w");
    var i = 0;
    var openNextUrl = function() {
        //从列表得到url
        var url = null;
        while (!url && gUrlList.length > 0) {
            url = gUrlList.shift();
        }
        if (!url) return;

        //打开url
        tabs.open(url);

        //如果没达到tab限制，则1s后打开下一个url
        i ++;
        if (i < TABS_LIMIT)
            timers.setTimeout(openNextUrl, 1000);
    };
    openNextUrl();
    fireTimerEvent();
}

function stopCrawling()
{
    logger.debug('stop crawing');
    gOutputFile.close();
    gOutputFile = null;
    logger.debug('quite on stop: ' + gQuitOnStop);
    if (gQuitOnStop)
       system.exit();
}

function finishTab(tab) {
    console.log('tab(title=' + tab.title + ', url=' + tab.url + ') completed');
    checkWindows();
    delete gTabInfos[tab.id];
    //继续打开其他页面
    if (gUrlList.length > 0) {
        var url = gUrlList.shift();
        console.log('new url=' + url);
        if (url)
            tab.url = url;
    }
    else if (tabs.length == 1)
        tab.url = 'about:blank';
    else
        tab.close();
}

tabs.on('load', finishTab);

function checkWindows()
{
    //遍历window
    blockdata.forEachWnd(
        function(wnd, data, startTime) {
            var blockList = data[1];
            var removeWnd = false;
            var text = null;
   
            //避免dead object错误
            try {
                wnd.document.readyState;
            } catch (err) { //dead object
                return true;
            }

            if (!wnd.location)
                return true;

            var shouldFinish = false;
            if (wnd && Date.now() - startTime > WND_TIMEOUT) {
                logger.debug('stop window(title=' + wnd.document.title + ', url=' + wnd.location.href + ') for loading too long time');
                shouldFinish = true;
            }
            else if (wnd && wnd.document.readyState == 'complete') { //文档完成
                shouldFinish = true;
            }

            if (shouldFinish) {
                gFinishDocCount ++;
    
                //提取特征
                extractor.extract(wnd, blockList);
    
                //显示拦截的资源
                var lineLen = 143;
                logger.debug('wnd start.');
                logger.debug('+' + utils.extendString('', '-', lineLen - 2) + '+');
                logger.debug('| ' + utils.extendString(wnd.location.href, ' ', lineLen - 4) + ' |');
                logger.debug('+' + utils.extendString('', '-', lineLen - 2) + '+');
                gOutputFile.write(wnd.location.href+'\n');

                //block=0:非广告, 1:广告
                for (var block = 1; block >= 0; block --) {
                    //资源类型：图片、iframe等
                    for (var type in data[block]) {
                        var typeBlockList = data[block][type];
                        //资源列表
                        for (var resUrl in typeBlockList) {
                            var features = typeBlockList[resUrl].features;
                            logger.debug(
                                    '|' + (block ? 'AD' : '  ')
                                    + '|' + utils.extendString(type, ' ', 13)
                                    + '|' + utils.extendString(resUrl, ' ', lineLen - 39)
                                    + '|' + utils.extendString(utils.objectToString(features, true), ' ', 19)
                                    + '|');
                            var num_features = features.length;
                            //输出到文本
                            gOutputFile.write((block?'1':'0') + '\t' + type + '\t' + utils.objectToString(features, true, '\t')  + '\t' + resUrl + '\n');

                        }
                    }
                }
                gOutputFile.flush();
                wnd.stop();
                logger.debug('+' + utils.extendString('', '-', lineLen - 2) + '+');
                logger.debug('wnd end.');
                return true;
            }
        });
        logger.debug('finished:' + gFinishDocCount + ', loading:' + blockdata.getWndCount() + ', queueing:' + gUrlList.length);
}

function checkTabs()
{
    for each (var tab in tabs) {
        //记录tab信息：url和开始时间
        var tabInfo = null;
        if (tab.url.match(/^https?:/)) {
            if (!(tab.id in gTabInfos))
                gTabInfos[tab.id] = { startTime: Date.now(), url : tab.url };
            tabInfo = gTabInfos[tab.id];
        }

        //如果加载时间过长就关闭
        if (tabInfo && Date.now() - tabInfo.startTime > TAB_TIMEOUT) {
            logger.debug('close tab(title=' + tab.title + ', url=' + tab.url + ') for loading too long time');
            finishTab(tab);
        }
        //关闭错误页
        else if (tab.title == '页面载入出错' || tab.contentType.indexOf('application/') == 0) {
            logger.debug('close tab(title=' + tab.title + ', url=' + tab.url + ') for load error');
            finishTab(tab);
        }
    }
}

function timerEvent()
{
    checkWindows();
    checkTabs();
    if (blockdata.getWndCount() + gUrlList.length > 0)
        fireTimerEvent();
    else
        stopCrawling();
}

function fireTimerEvent()
{
    timers.setTimeout(timerEvent , 1000);
}

exports.startCrawling = startCrawling;
exports.quiteOnStop = function() {
    gQuitOnStop = true;
};
