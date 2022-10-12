import * as core from '@actions/core';
import { PrGuard } from './pr-guard';

try {
	const spinoffWaitTime = 10;

	setTimeout(() => {
		console.log(`Waiting ${spinoffWaitTime} seconds for checks to start.`);
		new PrGuard().run();
	}, spinoffWaitTime * 1000);
} catch (exception) {
	core.setFailed(exception);
}
