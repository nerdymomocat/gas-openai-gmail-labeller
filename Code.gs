// Serve HTML page
function doGet() {
    return HtmlService.createTemplateFromFile('Page')
        .evaluate();
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename)
        .getContent();
}
// Save and retrieve email filter data
function getStoredData() {
    var scriptProperties = PropertiesService.getScriptProperties();
    return JSON.parse(scriptProperties.getProperty('emailFilters') || '[]');
}

function saveStoredData(data) {
    var scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('emailFilters', JSON.stringify(data));
}

// Save and retrieve OpenAI API Key
function saveApiKey(apiKey) {
    var scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('openaiApiKey', apiKey);
}

function getApiKey() {
    var scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('openaiApiKey');
}

// Process emails
function processEmails() {
    const privateLabels = getPrivateLabels();
    var scriptProperties = PropertiesService.getScriptProperties();
    var processedEmails = JSON.parse(scriptProperties.getProperty('processedEmails') || '[]');
    var filters = JSON.parse(scriptProperties.getProperty('emailFilters') || '[]');

    var query = 'in:inbox newer_than:5d';
    var threads = GmailApp.search(query);

    threads.forEach(function(thread) {
        var existingLabelNames = thread.getLabels().map(label => label.getName());

        if (privateLabels.some(label => existingLabelNames.includes(label))) {
            return; // Skip this thread
        }

        var messages = thread.getMessages();
        var allMessagesProcessed = messages.every(message => processedEmails.includes(message.getId()));

        if (allMessagesProcessed) {
            return;
        }

        var threadText = getThreadAsPlainText(thread);
        var results = checkCriteriaWithOpenAI(threadText, filters);
        if (!results) {
            return; // Skip if results are null or undefined
        }
        
        results = JSON.parse(results).labels;
        
        // Loop through each label in the results dictionary
        for (var labelName in results) {
            var isLabelApplied = existingLabelNames.includes(labelName);
            var label = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
            var result = results[labelName]; // Get the result for this label from the dictionary

            // Find the corresponding filter object from the filters array (if it exists)
            var filter = filters.find(f => f.label === labelName);

            if (result) { // If result is true
                if (!isLabelApplied) {
                    thread.addLabel(label); // Apply label if not already applied
                }
                if (filter && filter.archive) {
                    thread.moveToArchive(); // Archive the thread if the archive property is true
                }
            } else if (!result && filter && filter.removable && isLabelApplied) {
                thread.removeLabel(label); // Remove the label
            }
        }

        // Mark all messages in the thread as processed
        messages.forEach(message => processedEmails.push(message.getId()));
    });

    // Save the updated processedThreads list
    scriptProperties.setProperty('processedEmails', JSON.stringify(processedEmails));
}


function getThreadAsPlainText(thread) {
    var messages = thread.getMessages();
    var threadText = "";
    
    // Get the user's Gmail address and aliases
    var myEmail = Session.getActiveUser().getEmail();
    var myAliases = GmailApp.getAliases();
    
    messages.forEach(function(message) {
        var date = message.getDate();
        var sender = message.getFrom();
        var receiver = message.getTo();
        var subject = message.getSubject();
        var body = message.getPlainBody();
        
        var meAsSender = (sender === myEmail || myAliases.includes(sender)) ? " (Me)" : "";
        var meAsReceiver = (receiver === myEmail || myAliases.includes(receiver)) ? " (Me)" : "";
        
        threadText += "Date: " + date + "\n";
        threadText += "Sender: " + sender + meAsSender + "\n";
        threadText += "Receiver: " + receiver + meAsReceiver + "\n";
        threadText += "Subject: " + subject + "\n";
        threadText += "Body: " + body + "\n\n";
    });
    threadText = threadText.replace(/https?:\/\/[^\s]+/g, '');
    threadText = threadText.replace(/\r/g, '');
    return threadText;
}


function checkCriteriaWithOpenAI(thread, filters) {

    let modelName;
    if (thread.length < 8000) {
        modelName = "gpt-3.5-turbo";
    } else if (thread.length < 32000) {
        modelName = "gpt-3.5-turbo-16k";
    } else {
        modelName = "gpt-3.5-turbo-16k";
        thread = thread.substring(0, 32000); // Trimming to 32000 characters
    }

    const filteredFilters = filters.filter(filter => filter.label.trim() !== '');
    // Prepare the filters as an array

    const labelsObject = filteredFilters.reduce((acc, filter) => {
        acc[filter.label] = {
            type: 'boolean'
        };
        return acc;
    }, {});

    const labelsList = filteredFilters.map(filter => filter.label);

    const filtersArray = filteredFilters.map(filter => ({
        label: filter.label,
        criteria: filter.criteria
    }));


    //{
    //   "$schema": "http://json-schema.org/draft-07/schema#",
    //   "type": "object",
    //   "properties": {
    //     "nestedDict": {
    //       "type": "object",
    //       "properties": {
    //         "subOption1": { "type": "boolean" },
    //         "subOption2": { "type": "boolean" },
    //         "subOption3": { "type": "boolean" }
    //       },
    //       "required": ["subOption1", "subOption2", "subOption3"],
    //       "additionalProperties": false
    //     },
    //     "singleString": {
    //       "type": "string"
    //     }
    //   },
    //   "required": ["nestedDict", "singleString"],
    //   "additionalProperties": false
    // }



    // Prepare the OpenAI API request payload
    const payload = JSON.stringify({
        model: modelName,
        functions: [{
            "name": "process_applicable_labels",
            "description": "For a given dictionary, with they key being the label and the value being true or false, a label is added or removed from a gmail thread",
            "parameters": {
                "type": "object",
                "properties": {
                    "labels": {
                        "type": "object",
                        "properties": labelsObject,
                        "required": labelsList,
                        "additionalProperties": false
                    }
                },
                "required": ["labels"],
                "additionalProperties": false
            }
        }],
        messages: [{
                role: "system",
                content: "You are a helpful assistant that checks which of the email label applies given an email thread of subject, sender, receiver, date content. The email thread is sorted chronologically in a descending order. You return a boolean value for each of the filters. Remember the length of the array of boolean should be equal to the length of filters provided. For each of these filters, you have a label and the criteria where the label should be applied, and hence the value for that label as key is true. If you think the description does not match, for that label, set value as false. Here are the labels and the criteria to apply them: " + JSON.stringify(filtersArray, null, 2)
            },
            {
                role: "user",
                content: "This is the Email Thread:"+thread
            }
        ]
    });

    Logger.log(payload);

    const apiKey = getApiKey(); // Get API key from PropertiesService
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
        method: "post",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        payload: payload
    });

    try {
        const jsonResponse = JSON.parse(response.getContentText());
        Logger.log(jsonResponse);
        const results = jsonResponse.choices[0].message.function_call.arguments;
        return results;
    } catch (error) {
        // Handle parsing error
        console.error('Error parsing results:', error);
        return null;
    }
}

function getExistingLabels() {
    const labels = GmailApp.getUserLabels();
    return labels.map(label => label.getName());
}

function getAvailableLabels() {
    const existingLabels = GmailApp.getUserLabels().map(label => label.getName());
    const scriptProperties = PropertiesService.getScriptProperties();
    const currentFilters = JSON.parse(scriptProperties.getProperty('emailFilters') || '[]');
    const currentFilterLabels = currentFilters.map(filter => filter.label);
    const availableLabels = existingLabels.filter(label => !currentFilterLabels.includes(label));
    // Logger.log(availableLabels);
    return availableLabels;
}

function savePrivateLabels(privateLabels) {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('privateLabels', JSON.stringify(privateLabels));
}

function getPrivateLabels() {
    const scriptProperties = PropertiesService.getScriptProperties();
    return JSON.parse(scriptProperties.getProperty('privateLabels') || '[]');
}

function getLabelData() {
    const availableLabels = getAvailableLabels();
    const privateLabels = getPrivateLabels();
    return {
        availableLabels,
        privateLabels
    };
}
