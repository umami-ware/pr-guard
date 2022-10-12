import * as core from '@actions/core';
import * as github from '@actions/github';
import * as micromatch from 'micromatch';
import { Octokit } from '@octokit/core';
import { GithubUtils } from './github-utils';

export interface PrGuardParams {
	token: string;
	check_interval: number;
	timeout: number;
	required: string[];
	ignored: string[];
	restrict_pr_branches: { source: string; destination: string }[];
}

export class PrGuard {
	private checkInterval: number;
	private checkTimeout: number;

	private sourceBranch: string;
	private destinationBranch: string;
	private ownJobName: string;
	private owner: string;
	private repo: string;
	private sha: string;
	private octokit: Octokit;

	private params: PrGuardParams;

	constructor() {
		this.parseParams();
	}

	async run() {
		const branchNamesFine = this.checkBranches();

		if (!branchNamesFine) {
			return;
		}

		this.doWork();

		this.checkInterval = setInterval(async () => {
			this.doWork();
		}, this.params.check_interval * 1000);

		this.checkTimeout = setTimeout(() => {
			clearInterval(this.checkInterval);
			core.setFailed(`Timeout after ${this.params.timeout} seconds.`);
		}, this.params.timeout * 1000);
	}

	private checkBranches(): boolean {
		if (
			!this.params.restrict_pr_branches ||
			!this.params.restrict_pr_branches.length
		) {
			console.log('Skipped enforcing branches, restrict_pr_branches is empty.');
			return true;
		}

		const matchedDestinationBranches = this.params.restrict_pr_branches.filter(
			(x) => micromatch.isMatch(this.destinationBranch, x.destination)
		);

		let matched = true;

		if (matchedDestinationBranches.length == 0) {
			console.log(
				`Branch ${this.destinationBranch} does not have source branch enforcement`
			);
		} else {
			matched = !!matchedDestinationBranches.find((x) =>
				micromatch.isMatch(this.sourceBranch, x.source)
			);
		}

		if (matched) {
			console.log(
				`Branch ${this.destinationBranch} accepts PRs from ${this.sourceBranch}`
			);
		} else {
			core.setFailed(
				`Branch ${this.destinationBranch} does not accept PRs from ${this.sourceBranch}`
			);
		}

		return matched;
	}

	private async doWork() {
		const result = await this.checkRuns();

		console.log(`Check result: ${result}`);

		if (result === 'failure') {
			core.setFailed('Failed.');
		}

		if (result !== 'pending') {
			clearInterval(this.checkInterval);
			clearTimeout(this.checkTimeout);
		}
	}

	private async checkRuns(): Promise<'success' | 'pending' | 'failure'> {
		let checkRuns = await GithubUtils.getCheckRuns(
			this.octokit,
			this.owner,
			this.repo,
			this.sha,
			this.ownJobName
		);

		if (this.params.ignored && this.params.ignored.length) {
			checkRuns = checkRuns.filter(
				(job) =>
					!this.params.ignored.find((ignoredJob) => ignoredJob == job.name)
			);
		}

		if (this.params.required && this.params.required.length) {
			checkRuns = checkRuns.filter((job) =>
				this.params.required.find((requiredJob) => requiredJob == job.name)
			);
		}

		console.log(`Required jobs: [${this.params.required.join(', ')}]`);
		console.log(`Ignored jobs: [${this.params.ignored.join(', ')}]`);

		console.log(
			`Jobs that will be checked: [${checkRuns.map((x) => x.name).join(', ')}]`
		);

		const passedChecks = checkRuns.filter(
			(x) => x.status == 'completed' && x.conclusion == 'success'
		);

		const failedChecks = checkRuns.filter(
			(x) => x.status == 'completed' && x.conclusion == 'failure'
		);

		console.log(`Checks: ${checkRuns.length}`);
		console.log(`Checks that passed: ${passedChecks.length}`);
		console.log(`Checks that failed: ${failedChecks.length}`);

		if (checkRuns.length == passedChecks.length) {
			return 'success';
		}

		if (failedChecks.length != 0) {
			return 'failure';
		}

		return 'pending';
	}

	private parseParams() {
		const token = core.getInput('token');

		const check_interval = parseInt(core.getInput('check_interval'));
		const timeout = parseInt(core.getInput('timeout'));

		const restrict_pr_branches = core
			.getInput('restrict_pr_branches')
			.split(',')
			.filter((x) => x && x.includes('=>'))
			.map((x) => ({
				source: x.split('=>')[0].trim(),
				destination: x.split('=>')[1].trim(),
			}));

		const ignored = core
			.getInput('ignored')
			.split(',')
			.filter((x) => x)
			.map((x) => x.trim());

		const required = core
			.getInput('required')
			.split(',')
			.filter((x) => x)
			.map((x) => x.trim());

		if (ignored.length && required.length) {
			throw 'required and ignored params can`t be used together';
		}

		this.params = {
			check_interval,
			timeout,
			ignored,
			required,
			token,
			restrict_pr_branches,
		};

		this.sha = github.context.payload.pull_request?.head?.sha;

		this.sourceBranch = github.context.payload.pull_request?.head?.ref;
		this.destinationBranch = github.context.payload.pull_request?.base?.ref;

		this.owner = github.context.repo.owner;
		this.repo = github.context.repo.repo;
		this.ownJobName = github.context.job;

		this.octokit = github.getOctokit(core.getInput('token'));
	}
}
