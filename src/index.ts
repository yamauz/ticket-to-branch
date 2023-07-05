import { input } from "@inquirer/prompts";
import select from "@inquirer/select";
import "dotenv/config";
import ora from "ora-classic";
import pc from "picocolors";
import { getJiraApi } from "./jira";
import { getOpenAiApi, setPrompt } from "./open-ai";

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

// const sleep = (msec: number) =>
//   new Promise((resolve) => setTimeout(resolve, msec));

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
  const prompt = setPrompt(issue.fields.summary);
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  chatSpinner.succeed("候補のブランチ名を取得しました");

  const suggestedBranchNames =
    chatCompletion.data.choices?.[0].message?.content?.split(",");
  if (!suggestedBranchNames) throw new Error("Failed to get choices");

  const choices = suggestedBranchNames.map((branchName) => {
    const prefix = `hotfix/${issueNumber}/`;
    branchName = `${prefix}${branchName}`.replace(/\n/g, "").trimStart();
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
