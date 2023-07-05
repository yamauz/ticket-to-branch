import "dotenv/config";
import { getOpenAiApi } from "./open-ai";
import ora from "ora-classic";
import { input } from "@inquirer/prompts";
import select, { Separator } from "@inquirer/select";
import { getJiraApi } from "./jira";
import pc from "picocolors";

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

const ISSUE_NUMBER = "MJ-1";
const ISSUE_SUMMARY = "JIRA REST APIで課題情報を取得";

const setPrompt = (issueSummary: string) => {
  const issueSummaryReplacedPrompt = prompt.map((p) => {
    if (p === "__ISSUE_SUMMARY__") return `'${issueSummary}'`;
    return p;
  });
  return issueSummaryReplacedPrompt.join("\n");
};

const getEnv = () => {
  if (!process.env.JIRA_USERNAME)
    throw new Error("JIRA_USERNAME is not defined");
  if (!process.env.JIRA_PASSWORD)
    throw new Error("JIRA_PASSWORD is not defined");
  if (!process.env.JIRA_HOST) throw new Error("JIRA_HOST is not defined");
  if (!process.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY is not defined");

  return {
    jiraEnv: {
      username: process.env.JIRA_USERNAME,
      password: process.env.JIRA_PASSWORD,
      host: process.env.JIRA_HOST,
    },
    openAiEnv: {
      apiKey: process.env.OPENAI_API_KEY,
    },
  };
};

const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

const getSpinner = () => {
  const chatSpinner = ora("ブランチ名をChatGPTが提案中…");
  const jiraSpinner = ora("Jiraのチケット情報を取得中…");
  return { chatSpinner, jiraSpinner };
};

const main = async () => {
  // spinners
  const { chatSpinner, jiraSpinner } = getSpinner();
  // apis
  const { jiraEnv, openAiEnv } = getEnv();
  const jiraApi = getJiraApi(jiraEnv);
  const openai = getOpenAiApi(openAiEnv.apiKey);
  const issueNumber = await input({
    message: "Jiraのチケット名を入力してね",
    default: "MJ-1",
  });

  jiraSpinner.start();
  const issue = await jiraApi.findIssue(issueNumber);
  jiraSpinner.succeed(
    `Jiraのチケット情報を取得しました ${pc.green(
      pc.italic(`${issueNumber} ${issue.fields.summary}  `)
    )} `
  );

  chatSpinner.start();
  const prompt = setPrompt(ISSUE_SUMMARY);
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  chatSpinner.succeed("候補のブランチ名を取得しました");

  const suggestedBranchNames =
    chatCompletion.data.choices?.[0].message?.content?.split(",");
  if (!suggestedBranchNames) throw new Error("Failed to get choices");

  console.log(suggestedBranchNames);

  const choices = suggestedBranchNames.map((branchName) => {
    const prefix = `hotfix/${ISSUE_NUMBER}/`;
    branchName = `${prefix}${branchName}`.replace(/\r?\n/g, "").trimStart();
    return {
      name: branchName,
      value: branchName,
    };
  });

  await select({
    message: "ブランチ名を選択してね",
    choices,
  });
};

main();
