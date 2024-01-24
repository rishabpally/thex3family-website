import { useEffect, useMemo, useState } from "react"
import { GetStaticProps, InferGetServerSidePropsType } from "next"
import { useRouter } from "next/router"
import { useTranslation } from "next-i18next"
import { serverSideTranslations } from "next-i18next/serverSideTranslations"
import { FaGithub } from "react-icons/fa"
import {
  Badge,
  Box,
  chakra,
  Flex,
  forwardRef,
  Grid,
  Heading,
  useToken,
} from "@chakra-ui/react"

import { BasePageProps, ChildOnlyProp, Lang } from "@/lib/types"

import { Button, ButtonLink } from "@/components/Buttons"
import Emoji from "@/components/Emoji"
import FeedbackCard from "@/components/FeedbackCard"
import InlineLink, { BaseLink } from "@/components/Link"
import MainArticle from "@/components/MainArticle"
import Modal from "@/components/Modal"
import OldHeading from "@/components/OldHeading"
import Text from "@/components/OldText"
import PageMetadata from "@/components/PageMetadata"
import Translation from "@/components/Translation"
import { getSkillTranslationId, Skill } from "@/components/TutorialMetadata"
import TutorialTags from "@/components/TutorialTags"

import { existsNamespace } from "@/lib/utils/existsNamespace"
import { getLastDeployDate } from "@/lib/utils/getLastDeployDate"
import { trackCustomEvent } from "@/lib/utils/matomo"
import { getTutorialsData } from "@/lib/utils/md"
import { getLocaleTimestamp, INVALID_DATETIME } from "@/lib/utils/time"
import { getRequiredNamespacesForPage } from "@/lib/utils/translations"
import {
  filterTutorialsByLang,
  getSortedTutorialTagsForLang,
} from "@/lib/utils/tutorial"

import externalTutorials from "@/data/externalTutorials.json"

import { useRtlFlip } from "@/hooks/useRtlFlip"

import OriginalCard, {
  type IProps as OriginalCardProps,
} from "@/components/Card"

const FilterTag = forwardRef<{ isActive: boolean; name: string }, "button">(
  (props, ref) => {
    const { isActive, name, ...rest } = props
    return (
      <chakra.button
        ref={ref}
        bg="none"
        bgImage="radial-gradient(46.28% 66.31% at 66.95% 58.35%,rgba(127, 127, 213, 0.2) 0%,rgba(134, 168, 231, 0.2) 50%,rgba(145, 234, 228, 0.2) 100%)"
        border="1px"
        borderColor={isActive ? "primary300" : "white800"}
        borderRadius="base"
        boxShadow={!isActive ? "table" : undefined}
        color="text"
        fontSize="sm"
        lineHeight={1.2}
        opacity={isActive ? 1 : 0.7}
        p={2}
        textTransform="uppercase"
        _hover={{
          color: "primary.base",
          borderColor: "text200",
          opacity: "1",
        }}
        {...rest}
      >
        {name}
      </chakra.button>
    )
  }
)

type Props = BasePageProps & {
  internalTutorials: ITutorial[]
}

export const getStaticProps = (async ({ locale }) => {
  const requiredNamespaces = getRequiredNamespacesForPage(
    "/developers/tutorials"
  )

  const contentNotTranslated = !existsNamespace(locale!, requiredNamespaces[1])

  const lastDeployDate = getLastDeployDate()

  return {
    props: {
      ...(await serverSideTranslations(locale!, requiredNamespaces)),
      contentNotTranslated,
      internalTutorials: getTutorialsData(locale!),
      lastDeployDate,
    },
  }
}) satisfies GetStaticProps<Props>

export interface IExternalTutorial {
  url: string
  title: string
  description: string
  author: string
  authorGithub: string
  tags: Array<string>
  skillLevel: string
  timeToRead?: string
  lang: string
  publishDate: string
}

export interface ITutorial {
  to: string
  title: string
  description: string
  author: string
  tags?: Array<string>
  skill?: Skill
  timeToRead?: number | null
  published?: string | null
  lang: string
  isExternal: boolean
}

const published = (locale: string, published: string) => {
  const localeTimestamp = getLocaleTimestamp(locale as Lang, published)
  return localeTimestamp !== INVALID_DATETIME ? (
    <span>
      {localeTimestamp}
    </span>
  ) : null
}

const TutorialPage = ({
  internalTutorials,
}: InferGetServerSidePropsType<typeof getStaticProps>) => {
  const { locale } = useRouter()
  const { flipForRtl } = useRtlFlip()
  const tableBoxShadow = useToken("colors", "tableBoxShadow")
  const cardBoxShadow = useToken("colors", "cardBoxShadow")
  const filteredTutorialsByLang = useMemo(
    () =>
      filterTutorialsByLang(
        internalTutorials,
        externalTutorials,
        locale as Lang
      ),
    [internalTutorials, locale]
  )

  const allTags = useMemo(
    () => getSortedTutorialTagsForLang(filteredTutorialsByLang),
    [filteredTutorialsByLang]
  )

  const { t } = useTranslation()
  const [isModalOpen, setModalOpen] = useState(false)
  const [filteredTutorials, setFilteredTutorials] = useState(
    filteredTutorialsByLang
  )
  const [selectedTags, setSelectedTags] = useState<Array<string>>([])

  useEffect(() => {
    let tutorials = filteredTutorialsByLang

    if (selectedTags.length) {
      tutorials = tutorials.filter((tutorial) => {
        return selectedTags.every((tag) => (tutorial.tags || []).includes(tag))
      })
    }

    setFilteredTutorials(tutorials)
  }, [filteredTutorialsByLang, selectedTags])

  const handleTagSelect = (tagName: string) => {
    const tempSelectedTags = selectedTags

    const index = tempSelectedTags.indexOf(tagName)
    if (index > -1) {
      tempSelectedTags.splice(index, 1)
      trackCustomEvent({
        eventCategory: "tutorial tags",
        eventAction: "click",
        eventName: `${tagName} remove`,
      })
    } else {
      tempSelectedTags.push(tagName)
      trackCustomEvent({
        eventCategory: "tutorial tags",
        eventAction: "click",
        eventName: `${tagName} add`,
      })
    }

    setSelectedTags([...tempSelectedTags])
  }

  const CardGrid = ({ children }: ChildOnlyProp) => (
    <Grid
      templateColumns="repeat(auto-fill, minmax(min(100%, 280px), 1fr))"
      gap={0}
    >
      {children}
    </Grid>
  )

  return (
    <Flex
      as={MainArticle}
      flexDirection="column"
      alignItems="center"
      w="full"
      my={0}
      mx="auto"
      mt={16}
    >
      <PageMetadata
        title={t("page-knowledge:page-tutorials-meta-title")}
        description={t(
          "page-knowledge:page-tutorials-meta-description"
        )}
      />
      <Heading
        fontStyle="normal"
        fontWeight="semibold"
        fontFamily="monospace"
        textTransform="uppercase"
        fontSize="2rem"
        lineHeight="140%"
        textAlign="center"
        mt={{ base: 4, sm: 0 }}
        mx={{ base: 4, sm: 0 }}
        mb={{ base: 4, sm: "1.625rem" }}
      >
        <Translation id="page-knowledge:page-tutorial-title" />
      </Heading>
      <Text
        fontSize="xl"
        lineHeight="140%"
        color="text200"
        mb={4}
        textAlign="center"
      >
        <Translation id="page-knowledge:page-tutorial-subtitle" />
      </Text>

      <Modal isOpen={isModalOpen} setIsOpen={setModalOpen}>
        <Heading fontSize="2rem" lineHeight="1.4" mb={4}>
          <Translation id="page-knowledge:page-tutorial-submit-btn" />
        </Heading>
        <Text>
          <Translation id="page-knowledge:page-tutorial-listing-policy-intro" />{" "}
          <InlineLink to="/contributing/content-resources/">
            <Translation id="page-knowledge:page-tutorial-listing-policy" />
          </InlineLink>
        </Text>
        <Text>
          <Translation id="page-knowledge:page-tutorial-submit-tutorial" />
        </Text>
        <Flex
          flexDirection={{ base: "column", md: "initial" }}
          maxH={{ base: 64, md: "initial" }}
          overflowY={{ base: "scroll", md: "initial" }}
        >
          <Flex
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border"
            borderRadius="base"
            p={4}
            flexDirection="column"
            w={{ base: "full", md: "50%" }}
            justifyContent="space-between"
            mt={2}
            mb={{ base: 2, md: 6 }}
            ms={0}
            me={{ base: 0, md: 2 }}
          >
            <Text as="b">
              <Translation id="page-knowledge:page-tutorial-new-github" />
            </Text>
            <Text>
              <Translation id="page-knowledge:page-tutorial-new-github-desc" />
            </Text>
            <ButtonLink
              leftIcon={<FaGithub />}
              variant="outline"
              to="https://github.com/ethereum/ethereum-org-website/issues/new?assignees=&labels=Type%3A+Feature&template=suggest_tutorial.yaml&title="
            >
              <Translation id="page-knowledge:page-tutorial-raise-issue-btn" />
            </ButtonLink>
          </Flex>
          <Flex
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border"
            borderRadius="base"
            p={4}
            flexDirection="column"
            w={{ base: "full", md: "50%" }}
            justifyContent="space-between"
            mt={2}
            mb={{ base: 2, md: 6 }}
            ms={0}
            me={{ base: 0, md: 2 }}
          >
            <Text as="b">
              <Translation id="page-knowledge:page-tutorial-pull-request" />
            </Text>
            <Text>
              <Translation id="page-knowledge:page-tutorial-pull-request-desc-1" />{" "}
              <code>
                <Translation id="page-knowledge:page-tutorial-pull-request-desc-2" />
              </code>{" "}
              <Translation id="page-knowledge:page-tutorial-pull-request-desc-3" />
            </Text>
            <ButtonLink
              leftIcon={<FaGithub />}
              variant="outline"
              to="https://github.com/ethereum/ethereum-org-website/new/dev/src/content/developers/tutorials"
            >
              <Translation id="page-knowledge:page-tutorial-pull-request-btn" />
            </ButtonLink>
          </Flex>
        </Flex>
      </Modal>

      <Button
        variant="outline"
        color="text"
        borderColor="text"
        _hover={{
          color: "primary.base",
          borderColor: "primary.base",
          boxShadow: cardBoxShadow,
        }}
        _active={{
          bg: "secondaryButtonBackgroundActive",
        }}
        py={2}
        px={3}
        onClick={() => {
          setModalOpen(true)
          trackCustomEvent({
            eventCategory: "tutorials tags",
            eventAction: "click",
            eventName: "submit",
          })
        }}
      >
        <Translation id="page-knowledge:page-tutorial-submit-btn" />
      </Button>

      <Box
        boxShadow={tableBoxShadow}
        mb={8}
        mt={8}
        w={{ base: "full", md: "66%" }}
      >
        <Flex
          justifyContent="center"
          m={8}
          pb={{ base: 4, md: 8 }}
          pt={{ base: 4, md: "initial" }}
          px={{ base: 0, md: "initial" }}
          borderBottomWidth="1px"
          borderBottomStyle="solid"
          borderBottomColor="border"
          flexDirection={{ base: "column", md: "initial" }}
        >
          <Flex
            flexWrap="wrap"
            alignItems="center"
            gap={2}
            maxW={{ base: "full", md: "initial" }}
            mb={{ base: 4, md: "initial" }}
          >
            {Object.entries(allTags).map(([tagName, tagCount], idx) => {
              const name = `${tagName} (${tagCount})`
              const isActive = selectedTags.includes(tagName)
              return (
                <FilterTag
                  key={idx}
                  onClick={() => handleTagSelect(tagName)}
                  {...{ name, isActive }}
                />
              )
            })}
            {selectedTags.length > 0 && (
              <Button
                color="primary.base"
                textDecoration="underline"
                bg="none"
                border="none"
                cursor="pointer"
                p={0}
                _hover={{
                  bg: "none",
                }}
                onClick={() => {
                  setSelectedTags([])
                  trackCustomEvent({
                    eventCategory: "tutorial tags",
                    eventAction: "click",
                    eventName: "clear",
                  })
                }}
              >
                <Translation id="page-knowledge:page-find-wallet-clear" />
              </Button>
            )}
          </Flex>
        </Flex>
        {filteredTutorials.length === 0 && (
          <Box mt={0} textAlign="center" padding={12}>
            <Emoji text=":crying_face:" fontSize="5xl" mb={8} mt={8} />
            <OldHeading>
              <Translation id="page-knowledge:page-tutorial-tags-error" />
            </OldHeading>
            <Text>
              <Translation id="page-knowledge:page-find-wallet-try-removing" />
            </Text>
          </Box>
        )}
        <CardGrid>
          {filteredTutorials.map((tutorial) => {
            return (
              <Flex
                as={BaseLink}
                textDecoration="none"
                flexDirection="column"
                justifyContent="space-between"
                fontWeight="normal"
                color="text"
                // boxShadow="0px 1px 1px var(--x3-colors-tableItemBoxShadow)"
                border="1px solid"
                padding={8}
                w="full"
                _hover={{
                  textDecoration: "none",
                  borderRadius: "base",
                  boxShadow: "0 0 1px var(--x3-colors-primary-base)",
                  bg: "tableBackgroundHover",
                }}
                key={tutorial.to}
                to={tutorial.to ?? undefined}
                hideArrow
              >
                <Flex
                  justifyContent="space-between"
                  alignItems="flex-start"
                  flexDirection={{ base: "column" }}
                  gap={6}
                >
                  <Badge variant="secondary">
                    <Translation id={getSkillTranslationId(tutorial.skill!)} />
                  </Badge>
                  <Text
                    noOfLines={2}
                    color="text"
                    fontWeight="semibold"
                    fontSize="2xl"
                  >
                    {tutorial.title}
                  </Text>
                </Flex>
                <Text noOfLines={3} color="text200">{tutorial.description}</Text>
                <div>
                  <Flex direction="column" align="start" fontSize="sm" color="text200" textTransform="uppercase" mb={6}>
                    <Flex align="center" mb={1}>
                      <Emoji text=":writing_hand:" fontSize="sm" me={2} />
                      {tutorial.author}
                    </Flex>
                    {published(locale!, tutorial.published ?? "") && (
                      <Flex align="center" mb={1}>
                        <Emoji text=":calendar:" fontSize="sm" me={2} />
                        {published(locale!, tutorial.published ?? "")}
                      </Flex>
                    )}
                    {tutorial.timeToRead && (
                      <Flex align="center" mb={1}>
                        <Emoji text=":stopwatch:" fontSize="sm" me={2} />
                        {tutorial.timeToRead} <Translation id="read-time" />
                      </Flex>
                    )}
                  </Flex>
                  <Flex flexWrap="wrap" w="full">
                    <TutorialTags tags={tutorial.tags?.slice(0, 2) ?? []} />
                  </Flex>
                </div>
              </Flex>
            )
          })}
        </CardGrid>
      </Box>
      <FeedbackCard />
    </Flex>
  )
}

export default TutorialPage
