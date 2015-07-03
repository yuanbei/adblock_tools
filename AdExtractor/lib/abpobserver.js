var logger      = require('./logger.js');
var blockdata   = require('./blockdata.js');

const {Cu} = require("chrome");
Cu.import( "resource://gre/modules/Services.jsm" );

var gPolicy = null;
var gAbpProcessNode = null;
var gBlockTable = [];

function abprequire( module ) {
  let result = {};
  result.wrappedJSObject = result;
  Services.obs.notifyObservers( result, "adblockplus-require", module );
  return result.exports;
}

function wrapProcessNode(wnd, node, contentType, location, collapse) {
    //调用原processNode函数，得到结果
    var result = gAbpProcessNode(wnd, node, contentType, location, collapse);

    //初始化窗口状态
    blockdata.initWndData(wnd);

    //记录过滤结果
    if (!result) { //false表示被过滤
        var type = null;
        switch (contentType) {
        case gPolicy.type.SCRIPT:
        case gPolicy.type.SUBDOCUMENT:
        case gPolicy.type.IMAGE:
        case gPolicy.type.OBJECT:
            type = node.tagName;
        }
        if (type) {
            var resUrl = location.spec;
            blockdata.initElemData(wnd, 1, type, resUrl);
        }
    }

    switch (node.tagName)
    {
    case 'IMG':
    case 'EMBED':
    case 'OBJECT':
        return true;
    default:
        return result;
    }
}

function startObserver()
{
    //获得Polity对象
    if (gPolicy == null)
        gPolicy = abprequire( "contentPolicy" ).Policy;
    if (gPolicy == null) {
        logger.debug('ERROR: Policy is null');
        return;
    }

    //获得processNode函数
    if (gAbpProcessNode == null)
        gAbpProcessNode = gPolicy['processNode'];
    if (!gAbpProcessNode) {
        logger.debug('ERROR: processNode is null');
        return;
    }

    //替换gPolicy.processNode函数
    gPolicy['processNode'] = wrapProcessNode;
    logger.debug('AdBlockPlus observer started');
}

function stopObserver()
{
    gPolicy['processNode'] = gAbpProcessNode;
    logger.debug('AdBlockPlus observer stopedd');
}

exports.startObserver = startObserver;
exports.stopObserver = stopObserver;
