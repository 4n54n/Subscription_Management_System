import {
  Args,
  Int,
  Mutation,
  Parent,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { difference } from 'lodash-es';

import {
  Feature,
  Models,
  type UserFeatureName,
  type WorkspaceFeatureName,
} from '../../models';
import { Admin } from '../common';
import { UserType } from '../user/types';
import { AvailableUserFeatureConfig } from './types';

registerEnumType(Feature, {
  name: 'FeatureType',
});

@Resolver(() => UserType)
export class UserFeatureResolver extends AvailableUserFeatureConfig {
  constructor(private readonly models: Models) {
    super();
  }

  @ResolveField(() => [Feature], {
    name: 'features',
    description: 'Enabled features of a user',
  })
  async userFeatures(@Parent() user: UserType) {
    const features = await this.models.userFeature.list(user.id);
    const availableUserFeatures = this.availableUserFeatures();
    return features.filter(feature => availableUserFeatures.has(feature));
  }

  @ResolveField(() => Int, {
    name: 'storageQuotaGB',
    description: 'Storage quota of a user in GB',
    nullable: true,
  })
  async storageQuotaGB(@Parent() user: UserType): Promise<number> {
    if (user.storageQuotaGB && user.storageQuotaGB > 0) {
      return user.storageQuotaGB;
    }
    const isAdmin = await this.models.userFeature.has(user.id, 'administrator');
    return isAdmin ? 100 : 10;
  }
}

@Admin()
@Resolver(() => Boolean)
export class AdminFeatureManagementResolver extends AvailableUserFeatureConfig {
  constructor(private readonly models: Models) {
    super();
  }

  @Mutation(() => [Feature], {
    description: 'update user enabled feature',
  })
  async updateUserFeatures(
    @Args('id') id: string,
    @Args({ name: 'features', type: () => [Feature] })
    features: UserFeatureName[]
  ) {
    const configurableUserFeatures = this.configurableUserFeatures();
    const removed = difference(Array.from(configurableUserFeatures), features);

    await Promise.all(
      features.map(async feature => {
        if (configurableUserFeatures.has(feature)) {
          return this.models.userFeature.add(id, feature, 'admin panel');
        } else {
          return;
        }
      })
    );

    await Promise.all(
      removed.map(feature => this.models.userFeature.remove(id, feature))
    );

    return features;
  }

  @Mutation(() => Boolean)
  async addWorkspaceFeature(
    @Args('workspaceId') workspaceId: string,
    @Args('feature', { type: () => Feature }) feature: WorkspaceFeatureName
  ) {
    await this.models.workspaceFeature.add(
      workspaceId,
      feature,
      'by administrator'
    );
    return true;
  }

  @Mutation(() => Boolean)
  async removeWorkspaceFeature(
    @Args('workspaceId') workspaceId: string,
    @Args('feature', { type: () => Feature }) feature: WorkspaceFeatureName
  ) {
    await this.models.workspaceFeature.remove(workspaceId, feature);
    return true;
  }
}
