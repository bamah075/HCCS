export const format_request = (postparam) => {
    var formData = new FormData();
    for (var key in postparam) {
        formData.append(key, postparam[key]);
    }
    return formData;
};

export const create_function = async (function_name, params = {}, post = false) => {
    var fetchParams = {
        method: !post ? "GET" : "POST"
    };
    if (post) {
        fetchParams['body'] = format_request(params);
    }
    var res = await fetch(function_name, fetchParams);
    var json = await res.json();

    return json;
};
