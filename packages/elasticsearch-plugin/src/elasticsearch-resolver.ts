import { Args, Mutation, Parent, Query, ResolveProperty, Resolver } from '@nestjs/graphql';
import { JobInfo, Permission, QuerySearchArgs, SearchInput, SearchResponse } from '@vendure/common/lib/generated-types';
import { Omit } from '@vendure/common/lib/omit';
import { Allow, Ctx, Decode, FacetValue, RequestContext, SearchResolver } from '@vendure/core';

import { ElasticsearchService } from './elasticsearch.service';

@Resolver('SearchResponse')
export class ShopElasticSearchResolver implements Omit<SearchResolver, 'reindex'> {

    constructor(private elasticsearchService: ElasticsearchService) {}

    @Query()
    @Allow(Permission.Public)
    @Decode('facetValueIds', 'collectionId')
    async search(
        @Ctx() ctx: RequestContext,
        @Args() args: QuerySearchArgs,
    ): Promise<Omit<SearchResponse, 'facetValues'>> {
        const result = await this.elasticsearchService.search(ctx, args.input, true);
        // ensure the facetValues property resolver has access to the input args
        (result as any).input = args.input;
        return result;
    }

    @ResolveProperty()
    async facetValues(
        @Ctx() ctx: RequestContext,
        @Parent() parent: { input: SearchInput },
    ): Promise<Array<{ facetValue: FacetValue; count: number }>> {
        return this.elasticsearchService.facetValues(ctx, parent.input, true);
    }
}

@Resolver('SearchResponse')
export class AdminElasticSearchResolver implements SearchResolver {

    constructor(private elasticsearchService: ElasticsearchService) {}

    @Query()
    @Allow(Permission.ReadCatalog)
    @Decode('facetValueIds', 'collectionId')
    async search(
        @Ctx() ctx: RequestContext,
        @Args() args: QuerySearchArgs,
    ): Promise<Omit<SearchResponse, 'facetValues'>> {
        const result = await this.elasticsearchService.search(ctx, args.input, false);
        // ensure the facetValues property resolver has access to the input args
        (result as any).input = args.input;
        return result;
    }

    @ResolveProperty()
    async facetValues(
        @Ctx() ctx: RequestContext,
        @Parent() parent: { input: SearchInput },
    ): Promise<Array<{ facetValue: FacetValue; count: number }>> {
        return this.elasticsearchService.facetValues(ctx, parent.input, false);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async reindex(@Ctx() ctx: RequestContext): Promise<JobInfo> {
        return this.elasticsearchService.reindex(ctx);

    }
}
