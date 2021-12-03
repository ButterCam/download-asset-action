const core = require('@actions/core');
const { Octokit } = require("@octokit/rest");
const { createActionAuth } = require("@octokit/auth-action");
const { save } = require("save-file");
const path = require('path');
const https = require('https')
const fs = require('fs');

async function run() {
    try {
        const auth = createActionAuth();
        const authentication = await auth();

        // Authentication
        const octokit = new Octokit();

        // Inputs
        const [owner, repo] = core.getInput('repository').split("/");
        const excludes = core.getInput('excludes').trim().split(",");
        const tag = core.getInput('tag');
        const assetName = core.getInput('asset');
        const target = core.getInput('target');

        // Get release
        let releases  = await octokit.repos.listReleases({
            owner: owner,
            repo: repo,
            headers: {
                authorization: `token ${authentication.token}`
            }
        });
        releases = releases.data;

        core.info("get releases")

        if (excludes) {
            if (excludes.includes('prerelease')) 
                releases = releases.filter(rel => rel.prerelease != true);
            if (excludes.includes('draft')) 
                releases = releases.filter(rel => rel.draft != true);
        }
        if (tag)
            releases = releases.filter(rel => rel.tag_name.includes(tag));
        if (releases.length === 0)
            throw new Error("No matching releases");

        // Get asset
        let assets = releases[0].assets;
        assets = assets.filter(ass => ass.name.includes(assetName));

        if (assets.length === 0)
            throw new Error("No matching assets");

            
        core.info("get asset start")

        const file = fs.createWriteStream(path.join(target, assets[0].name));
        https.request({
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/releases/assets/${assets[0].id}`,
            port: 443,
            headers: {
                Accept: "application/octet-stream",
                authorization: `token ${authentication.token}`
            },
            method: 'GET'
        }, (response) => {
            response.pipe(file);
        })

        core.info("get asset")

        // Save asset to target and set output
        core.setOutput('name', assets[0].name)
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run();