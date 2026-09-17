import { Hero } from '../components/Hero';
import { CategoryStrip } from '../components/CategoryStrip';
import { GroupStrip } from '../components/GroupStrip';
import { ValuePropsBand } from '../components/ValuePropsBand';

export function HomePage() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <GroupStrip />
      <ValuePropsBand />
    </>
  );
}
