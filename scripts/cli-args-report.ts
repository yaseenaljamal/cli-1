#!/usr/bin/env ts-node -C ttypescript

import { keys } from 'ts-transformer-keys';
import { MonitorOptions, Options, PolicyOptions, TestOptions } from '../src/lib/types';
import * as util from 'util';
import { exec } from 'child_process';

import { Parser } from "@json2csv/plainjs";

const asyncExec = util.promisify(exec);

const camelCaseToDashed = (s: string): string => {
    return s.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}

const options = keys<Options>().map(camelCaseToDashed);
const testOptions = keys<TestOptions>().map(camelCaseToDashed);
const policyOptions = keys<PolicyOptions>().map(camelCaseToDashed);
const monitorOptions = keys<MonitorOptions>().map(camelCaseToDashed);

export const main = async (): Promise<void> => {
    const argsMap = {};
    options.forEach((o) => argsMap[o] = {'option': `--${o}`, 'type': 'Options'});
    testOptions.forEach((o) => argsMap[o] = {'option': `--${o}`, 'type': 'TestOptions'});
    policyOptions.forEach((o) => argsMap[o] = {'option': `--${o}`, 'type': 'PolicyOptions'});
    monitorOptions.forEach((o) => argsMap[o] = {'option': `--${o}`, 'type': 'MonitorOptions'});

    const args = Object.keys(argsMap);
    args.sort();

    //args.forEach((arg) => console.log(argsMap[arg].option, argsMap[arg].type));

    const opts = await grepModuleOptions();
    //console.log(opts);
    args.forEach((arg) => {
        const option = argsMap[arg].option.replace(/^--/, '');
        const pkgs = opts[option];
        if (!pkgs) {
            opts[option] = new Set(['cli']);
        } else {
            pkgs.add('cli');
        }
    });
    const result: Array<any> = [];
    Object.keys(opts).forEach(k => {
        const row = {option: k};
        for (const pkg of opts[k]) {
            row[pkg] = true;
        }
        result.push(row);
    });
    //console.log(result);

    const parser = new Parser();
    const csv = parser.parse(result);
    console.log(csv);
}

export const grepModuleOptions = async (): Promise<{[key: string]: Set<string>}> => {
    const { stdout } = await asyncExec("grep -r 'options\\[' snyk-*-plugin", { "cwd": "./node_modules", "encoding": "utf8" });
    const lines = stdout.split(/\r?\n/).filter((line) => !line.match(/\/node_modules\//));
    const hiddenOptionMatches = lines.map((line) => {
        //console.log(line);
        const fileMatch = line.match(/(?<file>[^:]+):/);
        if (!fileMatch || !fileMatch.groups) {
            return;
        }
        const { groups: { file } } = fileMatch;
        const pkg = file.replace(/\/.*/, '');

        const mss = line.matchAll(/\Woptions\[['"](?<option>[^'"]+)['"]\]/g);
        const result: Array<{pkg: string, option: string}> = [];
        for (const ms of mss) {
            if (!ms.groups) {
                continue;
            }
            const { groups: { option } } = ms;
            if (!option) {
                continue;
            }
            result.push({pkg, option});
        }
        return result;
    }).filter((x) => x && x.length > 0).flatMap((x) => x);

    const cliOptionMatches = lines.map((line) => {
        const fileMatch = line.match(/(?<file>[^:]+):/);
        if (!fileMatch || !fileMatch.groups) {
            return;
        }
        const { groups: { file } } = fileMatch;
        const pkg = file.replace(/\/.*/, '');

        const mss = line.matchAll(/\Woptions\.(?<option>\w+)/g);
        const result: Array<{pkg: string, option: string}> = [];
        for (const ms of mss) {
            if (!ms.groups) {
                continue;
            }
            //console.log(ms);
            const { groups: { option } } = ms;
            if (!option) {
                continue;
            }
            result.push({pkg, option: camelCaseToDashed(option)});
        }
        return result;
    }).filter((x) => x && x.length > 0).flatMap((x) => x);

    const options = {};
    const addOptions = (match) => {
        if (!match) {
            return;
        }
        const files = options[match.option];
        if (!files) {
            options[match.option] = new Set([match.pkg]);
        } else {
            files.add(match.pkg);
        }
    };
    hiddenOptionMatches.forEach(addOptions);
    cliOptionMatches.forEach(addOptions);
    return options;
}

main().then(() => {
    process.exit(0)
}).catch((err) => {
    console.log(err);
    process.exit(1);
});
