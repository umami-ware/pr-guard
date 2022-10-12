# PR Guard

This action helps to enforce specific requirements for pull requests, which are not supported by default. Get full control over pull request checks and enforce source/destination branches.

## Params

|Name   | Description | Default | Example | Required |
|-----  | ------------- | -------|----|---|
|token  | github access token    | None | |Yes
|check_interval | time interval to perform the check (seconds)| 60| 60| No
|timeout| time amount after which PR Guard will fail if not finished (seconds) | 1200| 1200|No
required | set required jobs - if not passed, all jobs are required | ""| "job1,job2"| No
ignored | set ignored jobs | "" | "job1,job2" |No
|restrict_pr_branches | restricts pr branch merging sources (glob pattern)| "" |"* => main,dev => stag"| No


## Outputs

This github action will pass just if all other pull request checks passed. If ignored/required params are used, that rule will be enforced.

## How to use it

Create a new yaml file in .github/workflows and paste the following code. After that, from branch protection rules, make `pr-guard` check as `required`.

```
name: PR Guard

on:
  pull_request:
jobs:
  pr-guard:
    runs-on: ubuntu-latest
    steps:
      - name: Run PR Guard
        uses: umami-ware/pr-guard@main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```