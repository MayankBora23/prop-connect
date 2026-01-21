import { useQuery } from '@tanstack/react-query';
import { useCurrentCompany } from './useCompany';

export type Industry = 'real_estate' | 'education' | 'automobile_dealers';

export function useIndustry() {
  const { data: company, isLoading: companyLoading } = useCurrentCompany();

  // Until company is loaded, return loading state
  const industry = company?.industry as Industry | undefined;
  const isLoaded = !companyLoading && !!industry;

  return {
    data: industry,
    isLoading: companyLoading || !industry,
    isLoaded,
  };
}

export function useIsRealEstate() {
  const { data: industry } = useIndustry();
  return industry === 'real_estate';
}

export function useIsEducation() {
  const { data: industry } = useIndustry();
  return industry === 'education';
}

export function useIsAutomobileDealers() {
  const { data: industry } = useIndustry();
  return industry === 'automobile_dealers';
}

