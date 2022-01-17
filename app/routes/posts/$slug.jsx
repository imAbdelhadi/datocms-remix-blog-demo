import { Link } from "remix";
import { useLoaderData } from "remix";
import invariant from "tiny-invariant";
import styles from "~/styles/index.css";
import { request } from "~/lib/datocms";
import { responsiveImageFragment, metaTagsFragment } from "~/lib/fragments";
import { Avatar, links as avatarLinks } from "~/components/Avatar";
import { Date, links as dateLinks } from "~/components/Date";
import { StructuredText } from "react-datocms";
import { renderMetaTags } from "react-datocms";

export function links() {
  return [
    ...avatarLinks(),
    ...dateLinks(),
    { rel: "stylesheet", href: styles },
  ];
}

export const loader = async ({ params }) => {
  invariant(params.slug, "expected params.slug");

  const graphqlRequest = {
    query: `
        query PostBySlug($slug: String) {
        site: _site {
            favicon: faviconMetaTags {
              ...metaTagsFragment
            }
          }
          post(filter: {slug: {eq: $slug}}) {
            seo: _seoMetaTags {
              ...metaTagsFragment
            }
            title
            slug
            content {
              value
              blocks {
                __typename
                ...on ImageBlockRecord {
                  id
                  image {
                    responsiveImage(imgixParams: {fm: jpg, fit: crop, w: 2000, h: 1000 }) {
                      ...responsiveImageFragment
                    }
                  }
                }
              }
            }
            date
            ogImage: coverImage{
              url(imgixParams: {fm: jpg, fit: crop, w: 2000, h: 1000 })
            }
            coverImage {
              responsiveImage(imgixParams: {fm: jpg, fit: crop, w: 2000, h: 1000 }) {
                ...responsiveImageFragment
              }
            }
            author {
              name
              picture {
                url(imgixParams: {fm: jpg, fit: crop, w: 100, h: 100, sat: -100})
              }
            }
          }
          morePosts: allPosts(orderBy: date_DESC, first: 2, filter: {slug: {neq: $slug}}) {
            title
            slug
            excerpt
            date
            coverImage {
              responsiveImage(imgixParams: {fm: jpg, fit: crop, w: 2000, h: 1000 }) {
                ...responsiveImageFragment
              }
            }
            author {
              name
              picture {
                url(imgixParams: {fm: jpg, fit: crop, w: 100, h: 100, sat: -100})
              }
            }
          }
        }
        ${responsiveImageFragment}
        ${metaTagsFragment}
      `,
    variables: {
      slug: params.slug,
    },
  };

  return request(graphqlRequest);
};

export const meta = ({ data }) => {
  const { post, site } = data;
  const metaTags = post.seo.concat(site.favicon);

  return metaTags.reduce((acc, tag) => {
    if (!tag.attributes) {
      return {
        ...acc,
        [tag.tag]: tag.content,
      };
    }

    return {
      ...acc,
      [tag.attributes.property || tag.attributes.name]: tag.attributes.content,
    };
  }, {});
};

export default function PostSlug() {
  const { post, morePosts } = useLoaderData();

  return (
    <div className="container">
      <section className="section">
        <Link to={`/`} className="grid__link">
          <p className="section__title">Blog.</p>
        </Link>
      </section>
      <section className="section">
        <h1 className="title">{post.title}</h1>
      </section>
      <section className="section">
        <Avatar name={post.author.name} picture={post.author.picture} />
      </section>
      <img
        className="grid__image"
        srcset={post.coverImage.responsiveImage.srcSet}
        sizes={post.coverImage.responsiveImage.sizes}
        src={post.coverImage.responsiveImage.src}
      />
      <section className="section--narrow">
        <Date dateString={post.date} />
      </section>
      <section className="section--narrow">
        <div className="prose prose-lg prose-blue">
          <StructuredText
            data={post.content}
            renderBlock={({ record }) => {
              if (record.__typename === "ImageBlockRecord") {
                return (
                  <img
                    className="grid__image"
                    srcset={record.image.responsiveImage.srcSet}
                    sizes={record.image.responsiveImage.sizes}
                    src={record.image.responsiveImage.src}
                  />
                );
              }

              return (
                <>
                  <p>Don't know how to render a block!</p>
                  <pre>{JSON.stringify(record, null, 2)}</pre>
                </>
              );
            }}
          />
        </div>
      </section>
      <section className="section">
        <div className="section__title">More posts</div>
        <ul className="grid">
          {morePosts.map((post) => (
            <li key={post.slug} className="grid__item">
              <Link to={`/posts/${post.slug}`} className="grid__link">
                <div>
                  <img
                    className="grid__image"
                    srcset={post.coverImage.responsiveImage.srcSet}
                    sizes={post.coverImage.responsiveImage.sizes}
                    src={post.coverImage.responsiveImage.src}
                  />
                  <p className="grid__title">{post.title}</p>
                  <Date dateString={post.date} />
                  <p className="date">{post.excerpt}</p>
                  <Avatar
                    name={post.author.name}
                    picture={post.author.picture}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}