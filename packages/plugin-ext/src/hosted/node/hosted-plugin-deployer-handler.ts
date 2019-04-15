/********************************************************************************
 * Copyright (C) 2019 RedHat and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import { ILogger } from '@theia/core';
import { PluginDeployerHandler, PluginDeployerEntry, PluginMetadata } from '../../common/plugin-protocol';
import { HostedPluginReader } from './plugin-reader';
import { Deferred } from '@theia/core/lib/common/promise-util';

@injectable()
export class HostedPluginDeployerHandler implements PluginDeployerHandler {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(HostedPluginReader)
    private readonly reader: HostedPluginReader;

    /**
     * Managed plugin metadata backend entries.
     */
    private currentBackendPluginsMetadata: PluginMetadata[] | undefined;

    /**
     * Managed plugin metadata frontend entries.
     */
    private currentFrontendPluginsMetadata: PluginMetadata[] | undefined;

    private backendPluginsMetadataDeferred: Deferred<PluginMetadata[]> | undefined;

    private frontendPluginsMetadataDeferred: Deferred<PluginMetadata[]> | undefined;

    getDeployedFrontendMetadata(): Promise<PluginMetadata[]> {
        if (!this.currentFrontendPluginsMetadata) {
            this.frontendPluginsMetadataDeferred = new Deferred<PluginMetadata[]>();
            return this.frontendPluginsMetadataDeferred.promise;
        }
        return Promise.resolve(this.currentFrontendPluginsMetadata);
    }

    getDeployedBackendMetadata(): Promise<PluginMetadata[]> {
        if (!this.currentBackendPluginsMetadata) {
            this.backendPluginsMetadataDeferred = new Deferred<PluginMetadata[]>();
            return this.backendPluginsMetadataDeferred.promise;
        }
        return Promise.resolve(this.currentBackendPluginsMetadata);
    }

    async deployFrontendPlugins(frontendPlugins: PluginDeployerEntry[]): Promise<void> {
        if (!this.currentFrontendPluginsMetadata) {
            this.currentFrontendPluginsMetadata = [];
        }
        for (const plugin of frontendPlugins) {
            const metadata = await this.reader.getPluginMetadata(plugin.path());
            if (metadata) {
                if (this.currentFrontendPluginsMetadata.some(value => value.model.id === metadata.model.id)) {
                    continue;
                }

                this.currentFrontendPluginsMetadata.push(metadata);
                this.logger.info(`Deploying frontend plugin "${metadata.model.name}@${metadata.model.version}" from "${metadata.model.entryPoint.frontend || plugin.path()}"`);
            }
        }

        if (this.frontendPluginsMetadataDeferred) {
            this.frontendPluginsMetadataDeferred.resolve(this.currentFrontendPluginsMetadata);
            this.frontendPluginsMetadataDeferred = undefined;
        }
    }

    async deployBackendPlugins(backendPlugins: PluginDeployerEntry[]): Promise<void> {
        if (!this.currentBackendPluginsMetadata) {
            this.currentBackendPluginsMetadata = [];
        }
        for (const plugin of backendPlugins) {
            const metadata = await this.reader.getPluginMetadata(plugin.path());
            if (metadata) {
                if (this.currentBackendPluginsMetadata.some(value => value.model.id === metadata.model.id)) {
                    continue;
                }

                this.currentBackendPluginsMetadata.push(metadata);
                this.logger.info(`Deploying backend plugin "${metadata.model.name}@${metadata.model.version}" from "${metadata.model.entryPoint.backend || plugin.path()}"`);
            }
        }

        if (this.backendPluginsMetadataDeferred) {
            this.backendPluginsMetadataDeferred.resolve(this.currentBackendPluginsMetadata);
            this.backendPluginsMetadataDeferred = undefined;
        }
    }

}
