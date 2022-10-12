import { Octokit } from '@octokit/core';

export class GithubUtils {
	static async getCheckRuns(
		octokit: Octokit,
		owner: string,
		repo: string,
		ref: string,
		ownJobName: string
	): Promise<
		{ name: string; status: 'completed'; conclusion: 'success' | 'failure' }[]
	> {
		const pageSize = 100;

		let page = 1;
		let checkRuns = [];

		let response = await octokit.request(
			`GET /repos/${owner}/${repo}/commits/${ref}/check-runs?per_page=${pageSize}&page=${page}`,
			{
				owner,
				repo,
				ref,
			}
		);

		checkRuns = checkRuns.concat(response.data.check_runs);

		while (checkRuns.length < response.data.total_count) {
			page++;

			response = await octokit.request(
				`GET /repos/${owner}/${repo}/commits/${ref}/check-runs?per_page=${pageSize}&page=${page}`,
				{
					owner,
					repo,
					ref,
				}
			);

			checkRuns = checkRuns.concat(response.data.check_runs);
		}

		return checkRuns.filter((x) => x.name != ownJobName);
	}

	static async getCombinedStatus(
		octokit: Octokit,
		owner: string,
		repo: string,
		ref: string
	) {
		return await octokit.request(
			`GET /repos/${owner}/${repo}/commits/${ref}/status`,
			{
				owner,
				repo,
				ref,
			}
		);
	}
}
