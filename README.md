# Auto Email Labeller for GMail using OpenAI API
<img width="424" alt="Auto Labeller Using AI" src="https://github.com/nerdymomocat/gas-openai-gmail-labeller/assets/125716950/b91d8dd6-7a78-4736-9832-4f5c9dbe299a">

## Interface:
1. Welcome Screen
<img width="1240" alt="image" src="https://github.com/nerdymomocat/gas-openai-gmail-labeller/assets/125716950/eff24228-c431-43de-b2a5-ede37f8fe2f8">

2. New Labeller
<img width="428" alt="image" src="https://github.com/nerdymomocat/gas-openai-gmail-labeller/assets/125716950/bdc3c87a-7b9f-4f2c-b2d2-c64f44fb844a">

3. Edit Screen
<img width="424" alt="image" src="https://github.com/nerdymomocat/gas-openai-gmail-labeller/assets/125716950/7660b861-2f24-4ca0-8a01-3b35c4fb0a88">

4. Do Not Process Labels
<img width="423" alt="image" src="https://github.com/nerdymomocat/gas-openai-gmail-labeller/assets/125716950/c3a1d991-8c55-47b4-8a11-9e50a432864f">

## Setting up Google Apps Script
1. Setting up webapp interface
![Screen Recording 2023-09-16 at 12 15 28 AM](https://github.com/nerdymomocat/gas-openai-gmail-labeller/assets/125716950/826381e0-299d-4e05-9336-8b4076c1fc24)
2. Setting up trigger to run it every 5 minutes (you can choose to do it every minute if you want)
![Screen Recording 2023-09-16 at 12 17 00 AM](https://github.com/nerdymomocat/gas-openai-gmail-labeller/assets/125716950/09f94f0b-d36c-4fc4-88b6-b0a9cdca2fe7)
3. Remember to set up permissions by running processEmails once. It might show a warning because this is personal script.
![Screen Recording 2023-09-16 at 12 24 52 AM](https://github.com/nerdymomocat/gas-openai-gmail-labeller/assets/125716950/1b7386f1-3818-456b-ac0a-d571ca1c1369)


## FAQs
### What does auto archive mean?
You can skip the inbox!

### What does remove if no longer applicable mean?
If a thread already has label X, but given a new message, label X is no longer applicable, it also removes that label!

### What are private labels?
If you have emails that you do not want to send to OpenAI for whatever reason, you can setup a gmail filter to apply certain labels to it based on whatever criteria (sender, subject etc.). You can choose which labels should cause an email to be ignored and not to be sent to OpenAI.

### Why this over something say a GMail add on?
(a) You can choose your own OpenAI key
(b) You can use it with email accounts that are managed by your organization and you are not an admin. Because this is a personal script, it works!

Have fun!





