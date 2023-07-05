import JiraApi from "jira-client";

export const getJiraApi = (args: {
  host: string;
  username: string;
  password: string;
}) => {
  return new JiraApi({
    ...args,
    protocol: "https",
    apiVersion: "3",
    strictSSL: true,
  });
};
