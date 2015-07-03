
function extendString(str, c, len)
{
    if (len <= str.length)
        return str;
    var n = len - str.length;
    return str + Array(n + 1).join(c);
}

function objectToString(obj, simpleBool, separator)
{
    var result = '';
    if(!separator){
        separator = ',';
    }
    for (f in obj) {
        if (obj[f]) {
            if (result)
                result += separator;
            var v = obj[f];
            if (simpleBool && typeof(v) == 'boolean') {
                if (v)
                    result += f;
            }
            else
                result += f + '=' + obj[f];
        }
    }
    return result;
}

function cloneObject(obj)
{
    var newObj = {};
    for (f in obj)
        newObj[f] = obj[f];
    return newObj;
}

exports.extendString = extendString;
exports.objectToString = objectToString;
exports.cloneObject = cloneObject;
