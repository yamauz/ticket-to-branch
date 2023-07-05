import { Configuration, OpenAIApi } from "openai";

export const getOpenAiApi = (apiKey: string) => {
  const configuration = new Configuration({
    apiKey,
  });
  return new OpenAIApi(configuration);
};

const prompt = [
  "Please suggest 5 possible English branch names on github for the following Jira ticket name.",
  "Branch names must be output as comma-separated text.",
  "Do not output any text other than the branch name.",
  "Branch names do not need to be prefixed with feature, bugfix, etc.",
  "Branch names are all lowercase.",
  "branch names are in English.",
  "__ISSUE_SUMMARY__",
  "",
  "#Output",
];

export const setPrompt = (issueSummary: string) => {
  const issueSummaryReplacedPrompt = prompt.map((p) => {
    if (p === "__ISSUE_SUMMARY__") return `'${issueSummary}'`;
    return p;
  });
  return issueSummaryReplacedPrompt.join("\n");
};
